import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { KeyedMutex } from './KeyedMutex.js';
import { ApiError } from '../utils/ApiError.js';

const fileLocks = new KeyedMutex();

const RETRYABLE_FS_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Converts any exceljs cell value (rich text, hyperlink, formula, date) to a primitive. */
const normaliseCellValue = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return normaliseCellValue(value.result); // formula
    if ('text' in value) return normaliseCellValue(value.text); // hyperlink (e.g. emails typed in Excel)
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('');
    return '';
  }
  return value;
};

const TYPE_DEFAULTS = { string: '', number: 0, json: null };

/** Cell -> JS value. Blank cells (e.g. a column added in a later phase) get the column default. */
const coerce = (value, column) => {
  const raw = normaliseCellValue(value);
  const fallback = column.default ?? TYPE_DEFAULTS[column.type];
  if (raw === '') return structuredClone(fallback);
  if (column.type === 'number') {
    const num = Number(raw);
    return Number.isFinite(num) ? num : fallback;
  }
  if (column.type === 'json') {
    try {
      return JSON.parse(String(raw));
    } catch {
      return structuredClone(fallback);
    }
  }
  return String(raw).trim();
};

/** JS value -> cell. JSON columns are stored as text (e.g. invoice line items). */
const serialise = (value, column) =>
  column.type === 'json' ? JSON.stringify(value ?? column.default ?? null) : value;

const SYSTEM_KEYS = new Set(['id', 'createdAt', 'updatedAt']);

/**
 * One entity = one workbook file with one worksheet.
 *
 * Row 1 holds human-readable headers so the owner can open the file in Excel.
 * Every mutation:
 *   1. takes the per-file lock (no lost updates),
 *   2. reads the current rows from disk,
 *   3. writes the full workbook to "<file>.tmp",
 *   4. atomically renames it over the real file (no half-written files
 *      if the process crashes mid-write).
 *
 * Reads are lock-free: thanks to the atomic rename a reader always sees
 * either the complete old file or the complete new file.
 *
 * columns: [{ key, header, type: 'string' | 'number' | 'json', width?, default?, aliases? }]
 * `aliases` lists old header names so files written before a rename still load.
 * 'id', 'createdAt' and 'updatedAt' columns are added automatically.
 * 'json' columns hold structured data (e.g. line items) as JSON text in one cell.
 */
export class ExcelStore {
  constructor({ dataDir, fileName, sheetName, idPrefix, columns }) {
    this.filePath = path.join(dataDir, fileName);
    this.sheetName = sheetName;
    this.idPrefix = idPrefix;
    this.columns = [
      { key: 'id', header: 'ID', type: 'string', width: 12 },
      ...columns,
      { key: 'createdAt', header: 'Created At', type: 'string', width: 24 },
      { key: 'updatedAt', header: 'Updated At', type: 'string', width: 24 },
    ];
  }

  /** Creates the data folder and an empty workbook (headers only) if missing. */
  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fileLocks.run(this.filePath, async () => {
      try {
        await fs.access(this.filePath);
      } catch {
        await this.#writeRows([]);
      }
    });
  }

  // ---------- Public API ----------

  async findAll() {
    return this.#readRows();
  }

  async findById(id) {
    const rows = await this.#readRows();
    return rows.find((row) => row.id === id) ?? null;
  }

  /**
   * `input` is either a data object or a function `(existingRows) => data`.
   * The function form runs inside the file lock, so values derived from
   * existing rows (e.g. the next invoice number) can never be duplicated.
   */
  async create(input) {
    return this.#mutate((rows) => {
      const data = typeof input === 'function' ? input(rows) : input;
      const now = new Date().toISOString();
      const record = { ...this.#pick(data), id: this.#nextId(rows), createdAt: now, updatedAt: now };
      rows.push(record);
      return { rows, result: record };
    });
  }

  /** Returns the updated record, or null if the id does not exist. */
  /**
   * `input` is a data object or `(existingRecord, allRows) => data`; the
   * function form runs inside the file lock (e.g. assigning a certificate number).
   */
  async update(id, input) {
    return this.#mutate((rows) => {
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) return { rows: null, result: null };
      const existing = rows[index];
      const data = typeof input === 'function' ? input(existing, rows) : input;
      rows[index] = { ...existing, ...this.#pick(data), updatedAt: new Date().toISOString() };
      return { rows, result: rows[index] };
    });
  }

  /** Replaces every row (used by backup restore). Rows must include id/createdAt/updatedAt. */
  async replaceAll(rows) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    return fileLocks.run(this.filePath, () => this.#writeRows(rows));
  }

  /** Returns true if a record was deleted. */
  async delete(id) {
    return this.#mutate((rows) => {
      const remaining = rows.filter((row) => row.id !== id);
      if (remaining.length === rows.length) return { rows: null, result: false };
      return { rows: remaining, result: true };
    });
  }

  // ---------- Internals ----------

  /** Runs read-modify-write under the file lock. `rows: null` means "nothing to write". */
  async #mutate(change) {
    return fileLocks.run(this.filePath, async () => {
      const rows = await this.#readRows();
      const { rows: nextRows, result } = change(rows);
      if (nextRows) await this.#writeRows(nextRows);
      return result;
    });
  }

  /** Keeps only known, non-system columns from incoming data. */
  #pick(data) {
    const record = {};
    for (const { key } of this.columns) {
      if (!SYSTEM_KEYS.has(key) && data[key] !== undefined) record[key] = data[key];
    }
    return record;
  }

  #nextId(rows) {
    const pattern = new RegExp(`^${this.idPrefix}-(\\d+)$`);
    const max = rows.reduce((highest, row) => {
      const match = pattern.exec(row.id);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    return `${this.idPrefix}-${String(max + 1).padStart(4, '0')}`;
  }

  async #readRows() {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.readFile(this.filePath);
    } catch (error) {
      if (error.code === 'ENOENT') return [];
      throw new ApiError(500, `Could not read ${path.basename(this.filePath)}: ${error.message}`);
    }

    const sheet = workbook.getWorksheet(this.sheetName) ?? workbook.worksheets[0];
    if (!sheet) return [];

    // Map each column index to a field using the header text (or the key itself),
    // so reordering columns in Excel does not break anything.
    const columnByIndex = new Map();
    sheet.getRow(1).eachCell((cell, colNumber) => {
      const header = String(normaliseCellValue(cell.value)).trim().toLowerCase();
      const column = this.columns.find(
        (c) =>
          c.header.toLowerCase() === header ||
          c.key.toLowerCase() === header ||
          c.aliases?.some((alias) => alias.toLowerCase() === header), // renamed columns in older files
      );
      if (column) columnByIndex.set(colNumber, column);
    });

    const rows = [];
    sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const record = Object.fromEntries(this.columns.map((c) => [c.key, coerce('', c)]));
      for (const [colNumber, column] of columnByIndex) {
        record[column.key] = coerce(row.getCell(colNumber).value, column);
      }
      if (record.id) rows.push(record);
    });
    return rows;
  }

  async #writeRows(rows) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AgniDesk';
    const sheet = workbook.addWorksheet(this.sheetName, {
      views: [{ state: 'frozen', ySplit: 1 }],
    });
    sheet.columns = this.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 18 }));
    sheet.getRow(1).font = { bold: true };
    sheet.addRows(
      rows.map((row) => Object.fromEntries(this.columns.map((c) => [c.key, serialise(row[c.key], c)]))),
    );

    const tempPath = `${this.filePath}.tmp`;
    await workbook.xlsx.writeFile(tempPath);
    await this.#replaceFile(tempPath);
  }

  /** Atomic rename, retried because Windows briefly locks files (antivirus, open in Excel). */
  async #replaceFile(tempPath, attempts = 5) {
    for (let attempt = 1; ; attempt += 1) {
      try {
        await fs.rename(tempPath, this.filePath);
        return;
      } catch (error) {
        const retryable = RETRYABLE_FS_CODES.has(error.code);
        if (retryable && attempt < attempts) {
          await sleep(100 * attempt);
          continue;
        }
        await fs.rm(tempPath, { force: true });
        if (retryable) {
          throw new ApiError(503, `${path.basename(this.filePath)} is locked. Close it in Excel and try again.`);
        }
        throw error;
      }
    }
  }
}
