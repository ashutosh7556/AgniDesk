import { getSheetsClient, googleSheetsConfig } from '../config/googleSheets.js';
import { KeyedMutex } from './KeyedMutex.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Google Sheets as the database. One entity = one tab (sheet) in the spreadsheet.
 * Same public API as the old ExcelStore (findAll, findById, create, update,
 * delete, replaceAll, init) so services don't care which storage backs them.
 *
 * Design:
 * - Row 1 is the header row; columns are matched by header name (or aliases),
 *   so columns can be reordered or extra columns added in the sheet.
 *   Unmapped columns are preserved on update.
 * - Writes use valueInputOption RAW: values are stored exactly as sent
 *   (mobile numbers stay text; "=..." is never executed as a formula).
 * - Mutations run under a per-tab lock and re-read that tab first, so IDs are
 *   never duplicated and rows are located by ID right before writing.
 * - READ QUOTA: Google allows ~60 reads/minute. Normal reads therefore load
 *   ALL registered tabs in a single batchGet and cache the result briefly.
 * - Rows whose ID doesn't match the ID pattern (notes, test rows) are ignored.
 *
 * columns: [{
 *   key, header,
 *   type: 'string' | 'number' | 'json',
 *   default?,         // value when the cell is blank
 *   aliases?,         // other accepted header names (e.g. a typo in the sheet)
 *   optional?,        // read/written only if the header exists
 *   autoCreate?,      // appended to the header row at startup if missing
 *   compute?: (record) => value,  // write-only display column (never read back)
 * }]
 */

const sheetLocks = new KeyedMutex();
const DEFAULT_CACHE_MS = 5000;
const registry = new Set();
let batchInFlight = null;
let titlesCache = null;

const columnLetter = (index) => {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
};

const quote = (name) => `'${name.replace(/'/g, "''")}'`;

/** Sheets API errors -> API errors the frontend can show. Never leaks credentials. */
function toApiError(error) {
  if (error instanceof ApiError || error?.name === 'GoogleSheetsConfigError') return error;
  const status = error?.code ?? error?.response?.status;
  if (status === 429) return new ApiError(503, 'Google Sheets is busy (rate limit reached). Please try again in a minute.');
  if (status === 403) return new ApiError(503, 'Google Sheets access denied. Check that the spreadsheet is shared with the service account.');
  if (status === 404) return new ApiError(503, 'Google spreadsheet or sheet not found. Check GOOGLE_SHEETS_SPREADSHEET_ID.');
  console.error('[google-sheets]', error?.message ?? error);
  return new ApiError(503, 'Could not reach Google Sheets. Check your internet connection and try again.');
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Calls the Sheets API. Rate-limit (429) and temporary Google errors are
 * retried with backoff (1 s, 2 s, 4 s + jitter) before giving up.
 */
async function callSheets(request, attempts = 4) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await request(getSheetsClient());
    } catch (error) {
      const status = error?.code ?? error?.response?.status;
      if (RETRYABLE_STATUS.has(Number(status)) && attempt < attempts) {
        await sleep(2 ** (attempt - 1) * 1000 + Math.random() * 300);
        continue;
      }
      throw toApiError(error);
    }
  }
}

async function getSheetTitles({ fresh = false } = {}) {
  if (!titlesCache || fresh) {
    const res = await callSheets((sheets) =>
      sheets.spreadsheets.get({ spreadsheetId: googleSheetsConfig.spreadsheetId, fields: 'sheets.properties(sheetId,title)' }),
    );
    titlesCache = new Map((res.data.sheets ?? []).map((s) => [s.properties.title, s.properties.sheetId]));
  }
  return titlesCache;
}

export class GoogleSheetsStore {
  constructor({ sheetName, idPrefix, columns, idPattern, createTab = false, cacheMs = DEFAULT_CACHE_MS }) {
    this.sheetName = sheetName;
    this.idPrefix = idPrefix;
    this.idPattern = idPattern ?? new RegExp(`^${idPrefix}-(\\d+)$`);
    this.columns = columns;
    this.createTab = createTab;
    this.cacheMs = cacheMs;
    this.cache = null; // { at, headers, rows: [{ record, raw, rowNumber }] }
    registry.add(this);
  }

  /**
   * Startup: create the tab if allowed, check required headers, append
   * `autoCreate` headers. Misconfiguration stops the server; a temporary
   * network problem only logs a warning.
   */
  async init() {
    return GoogleSheetsStore.initAll([this]);
  }

  /**
   * Startup for several tabs with as few API calls as possible:
   * 1 metadata read, tab creation if needed, ONE batch read of all tabs,
   * then header checks / appends. Misconfiguration throws; a temporary
   * network problem only logs a warning.
   */
  static async initAll(stores) {
    try {
      const titles = await getSheetTitles();
      for (const store of stores) {
        if (titles.has(store.sheetName)) continue;
        if (!store.createTab) throw new Error(`Google Sheets tab "${store.sheetName}" does not exist. Create it with its header row.`);
        await store.#createTabWithHeaders();
      }
      await GoogleSheetsStore.loadAll();
      for (const store of stores) await store.#checkColumns();
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 503) {
        console.warn(`[google-sheets] Could not check tabs at startup: ${error.message}`);
        return;
      }
      throw error;
    }
  }

  async #checkColumns() {
    const { headers } = this.cache ?? (await this.#load({ fresh: true }));
    const has = (c) => [c.header, ...(c.aliases ?? [])].some((h) => headers.includes(h));
    const missing = this.columns.filter((c) => !c.optional && !c.autoCreate && !has(c)).map((c) => c.header);
    if (missing.length) throw new Error(`Google Sheets tab "${this.sheetName}" is missing column(s): ${missing.join(', ')}`);

    const toAdd = this.columns.filter((c) => c.autoCreate && !has(c)).map((c) => c.header);
    if (!toAdd.length) return;
    await this.#withLock(async () => {
      await callSheets((sheets) =>
        sheets.spreadsheets.values.update({
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          range: `${quote(this.sheetName)}!${columnLetter(headers.length)}1`,
          valueInputOption: 'RAW',
          requestBody: { values: [toAdd] },
        }),
      );
      this.cache = null;
    });
    console.log(`[google-sheets] Added column(s) to "${this.sheetName}": ${toAdd.join(', ')}`);
  }

  // ---------- Public API ----------

  async findAll() {
    return (await this.#load()).rows.map(({ record }) => record);
  }

  async findById(id) {
    return (await this.#load()).rows.find(({ record }) => record.id === id)?.record ?? null;
  }

  /** `input`: data object or `(existingRecords) => data` (runs under the tab lock). */
  async create(input) {
    return this.#withLock(async () => {
      const { headers, rows } = await this.#load({ fresh: true });
      const data = typeof input === 'function' ? input(rows.map((r) => r.record)) : input;
      const now = new Date().toISOString();
      const record = { ...this.#pick(data), id: data.id ?? this.#nextId(rows), createdAt: now, updatedAt: now };
      await this.#append(headers, [record]);
      this.#invalidate();
      return record;
    });
  }

  /** `input`: data object or `(existing, allRecords) => data`. Returns null if the id doesn't exist. */
  async update(id, input) {
    return this.#withLock(async () => {
      const { headers, rows } = await this.#load({ fresh: true });
      const found = rows.find(({ record }) => record.id === id);
      if (!found) return null;
      const data = typeof input === 'function' ? input(found.record, rows.map((r) => r.record)) : input;
      const record = {
        ...found.record,
        ...this.#pick(data),
        id: found.record.id,
        createdAt: found.record.createdAt,
        updatedAt: new Date().toISOString(),
      };
      await callSheets((sheets) =>
        sheets.spreadsheets.values.update({
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          range: `${quote(this.sheetName)}!A${found.rowNumber}:${columnLetter(headers.length - 1)}${found.rowNumber}`,
          valueInputOption: 'RAW',
          requestBody: { values: [this.#toRow(record, headers, found.raw)] },
        }),
      );
      this.#invalidate();
      return record;
    });
  }

  /**
   * Updates several rows in ONE write (used for automatically maintained
   * columns such as Products.Stock or Invoices.PaidAmount).
   * changes: Map<id, partialData>. Rows whose values don't change are skipped.
   */
  async updateMany(changes) {
    if (!changes.size) return 0;
    return this.#withLock(async () => {
      const { headers, rows } = await this.#load({ fresh: true });
      const data = [];
      for (const { record, raw, rowNumber } of rows) {
        const patch = changes.get(record.id);
        if (!patch) continue;
        const next = { ...record, ...patch };
        const nextRow = this.#toRow(next, headers, raw);
        if (nextRow.every((v, i) => String(v ?? '') === String(raw[i] ?? ''))) continue;
        data.push({ range: `${quote(this.sheetName)}!A${rowNumber}:${columnLetter(headers.length - 1)}${rowNumber}`, values: [nextRow] });
      }
      if (data.length) {
        await callSheets((sheets) =>
          sheets.spreadsheets.values.batchUpdate({
            spreadsheetId: googleSheetsConfig.spreadsheetId,
            requestBody: { valueInputOption: 'RAW', data },
          }),
        );
        this.#invalidate();
      }
      return data.length;
    });
  }

  /** Returns true if a row was deleted. */
  async delete(id) {
    return this.#withLock(async () => {
      const { rows } = await this.#load({ fresh: true });
      const found = rows.find(({ record }) => record.id === id);
      if (!found) return false;
      const sheetId = (await getSheetTitles()).get(this.sheetName);
      await callSheets((sheets) =>
        sheets.spreadsheets.batchUpdate({
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          requestBody: {
            requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: found.rowNumber - 1, endIndex: found.rowNumber } } }],
          },
        }),
      );
      this.#invalidate();
      return true;
    });
  }

  /** Replaces all data rows below the header (restore / derived tabs like InvoiceItems). */
  async replaceAll(records) {
    return this.#withLock(async () => {
      const { headers } = await this.#load({ fresh: true });
      await callSheets((sheets) =>
        sheets.spreadsheets.values.clear({
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          range: `${quote(this.sheetName)}!A2:${columnLetter(Math.max(headers.length, 26) - 1)}`,
        }),
      );
      if (records.length) {
        await callSheets((sheets) =>
          sheets.spreadsheets.values.update({
            spreadsheetId: googleSheetsConfig.spreadsheetId,
            range: `${quote(this.sheetName)}!A2`,
            valueInputOption: 'RAW',
            requestBody: { values: records.map((record) => this.#toRow(record, headers)) },
          }),
        );
      }
      this.#invalidate();
    });
  }

  // ---------- Batch loading (shared across all tabs) ----------

  /** Loads every registered tab in ONE API request and fills each tab's cache. */
  static async loadAll() {
    if (batchInFlight) return batchInFlight;
    // (tabs that don't exist yet are skipped; initAll creates them)
    const titles = await getSheetTitles();
    const stores = [...registry].filter((s) => titles.has(s.sheetName));
    batchInFlight = (async () => {
      try {
        const res = await callSheets((sheets) =>
          sheets.spreadsheets.values.batchGet({
            spreadsheetId: googleSheetsConfig.spreadsheetId,
            ranges: stores.map((s) => quote(s.sheetName)),
            valueRenderOption: 'UNFORMATTED_VALUE',
          }),
        );
        res.data.valueRanges.forEach((vr, i) => stores[i].ingest(vr.values ?? []));
      } finally {
        batchInFlight = null;
      }
    })();
    return batchInFlight;
  }

  /** Parses raw sheet values into this tab's cache (called by loadAll / #load). */
  ingest(values) {
    const [headerRow = [], ...dataRows] = values;
    const headers = headerRow.map((h) => String(h).trim());
    const indexOf = new Map(
      this.columns.map((c) => [c.key, headers.findIndex((h) => h === c.header || (c.aliases ?? []).includes(h))]),
    );
    const rows = [];
    dataRows.forEach((raw, i) => {
      const record = {};
      for (const column of this.columns) {
        if (column.compute) continue;
        const index = indexOf.get(column.key);
        record[column.key] = this.#parseCell(index >= 0 ? raw[index] : undefined, column);
      }
      if (this.idPattern.test(record.id)) rows.push({ record, raw, rowNumber: i + 2 });
    });
    this.cache = { at: Date.now(), headers, rows };
    return this.cache;
  }

  // ---------- Internals ----------

  #withLock(task) {
    return sheetLocks.run(`sheets:${this.sheetName}`, task);
  }

  /** Any write makes every cached tab stale (derived values may depend on it). */
  #invalidate() {
    for (const store of registry) store.cache = null;
  }

  async #load({ fresh = false } = {}) {
    if (!fresh && this.cache && Date.now() - this.cache.at < this.cacheMs) return this.cache;
    if (!fresh) {
      await GoogleSheetsStore.loadAll();
      if (this.cache) return this.cache;
    }
    const res = await callSheets((sheets) =>
      sheets.spreadsheets.values.get({
        spreadsheetId: googleSheetsConfig.spreadsheetId,
        range: quote(this.sheetName),
        valueRenderOption: 'UNFORMATTED_VALUE',
      }),
    );
    return this.ingest(res.data.values ?? []);
  }

  async #createTabWithHeaders() {
    await callSheets((sheets) =>
      sheets.spreadsheets.batchUpdate({
        spreadsheetId: googleSheetsConfig.spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: this.sheetName } } }] },
      }),
    );
    await callSheets((sheets) =>
      sheets.spreadsheets.values.update({
        spreadsheetId: googleSheetsConfig.spreadsheetId,
        range: `${quote(this.sheetName)}!A1`,
        valueInputOption: 'RAW',
        requestBody: { values: [this.columns.filter((c) => !c.optional || c.autoCreate).map((c) => c.header)] },
      }),
    );
    await getSheetTitles({ fresh: true });
    console.log(`[google-sheets] Created tab "${this.sheetName}".`);
  }

  async #append(headers, records) {
    await callSheets((sheets) =>
      sheets.spreadsheets.values.append({
        spreadsheetId: googleSheetsConfig.spreadsheetId,
        range: `${quote(this.sheetName)}!A1`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: records.map((record) => this.#toRow(record, headers)) },
      }),
    );
  }

  #parseCell(value, column) {
    const blank = value === undefined || value === null || value === '';
    if (blank) return structuredClone(column.default ?? (column.type === 'number' ? 0 : column.type === 'json' ? null : ''));
    if (column.type === 'number') {
      const num = Number(value);
      return Number.isFinite(num) ? num : (column.default ?? 0);
    }
    if (column.type === 'json') {
      try {
        return JSON.parse(String(value));
      } catch {
        return structuredClone(column.default ?? null);
      }
    }
    return String(value).trim();
  }

  /** Record -> row values in the sheet's header order (unmapped columns keep `base` values). */
  #toRow(record, headers, base = []) {
    return headers.map((header, i) => {
      const column = this.columns.find((c) => c.header === header || (c.aliases ?? []).includes(header));
      if (!column) return base[i] ?? '';
      const value = column.compute ? column.compute(record) : record[column.key];
      if (value === undefined || value === null) return '';
      if (column.type === 'json') return JSON.stringify(value);
      return value;
    });
  }

  #pick(data) {
    const record = {};
    for (const { key, compute } of this.columns) {
      if (compute || ['id', 'createdAt', 'updatedAt'].includes(key)) continue;
      if (data[key] !== undefined) record[key] = data[key];
    }
    return record;
  }

  #nextId(rows) {
    const max = rows.reduce((highest, { record }) => Math.max(highest, Number(this.idPattern.exec(record.id)?.[1] ?? 0)), 0);
    return `${this.idPrefix}-${String(max + 1).padStart(4, '0')}`;
  }
}
