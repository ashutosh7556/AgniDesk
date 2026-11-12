import { getSheetsClient, googleSheetsConfig } from '../config/googleSheets.js';
import { KeyedMutex } from './KeyedMutex.js';
import { ApiError } from '../utils/ApiError.js';

const sheetLocks = new KeyedMutex();

/** Google Sheets read quota is ~60 requests/minute/user, so reads are cached briefly. */
const DEFAULT_CACHE_MS = 5000;

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

/**
 * One entity = one tab (sheet) in the Google spreadsheet. Same public API as
 * ExcelStore (findAll, findById, create, update, delete, init) so services
 * don't care which storage backs them.
 *
 * - Row 1 is the header row; columns are matched by header name, so the owner
 *   can reorder columns or add extra ones in Google Sheets without breaking anything.
 *   Extra (unmapped) columns are preserved on update.
 * - Writes use valueInputOption RAW: values are stored exactly as sent
 *   (mobile numbers stay text; "=..." is never executed as a formula).
 * - Mutations run under an in-process lock and re-read the sheet first, so
 *   IDs are never duplicated and rows are located by ID right before writing.
 * - Rows whose ID doesn't match `idPattern` (e.g. notes or test rows typed
 *   manually) are ignored.
 *
 * columns: [{ key, header, type: 'string' | 'number', optional? }]
 * `optional` columns are read/written only if that header exists in the sheet.
 */
export class GoogleSheetsStore {
  constructor({ sheetName, idPrefix, columns, cacheMs = DEFAULT_CACHE_MS }) {
    this.sheetName = sheetName;
    this.idPrefix = idPrefix;
    this.idPattern = new RegExp(`^${idPrefix}-(\\d+)$`);
    this.columns = columns;
    this.idColumn = columns.find((c) => c.key === 'id');
    this.cacheMs = cacheMs;
    this.cache = null; // { at, headers, rows }
    this.sheetId = null; // numeric tab id, needed to delete rows
  }

  get #lockKey() {
    return `sheets:${this.sheetName}`;
  }

  /**
   * Startup check: sheet exists and has every required header.
   * Misconfiguration stops the server (clear message); a temporary network
   * problem only logs a warning so the rest of the app still starts.
   */
  async init() {
    let headers;
    try {
      ({ headers } = await this.#load({ fresh: true }));
    } catch (error) {
      if (error?.name === 'GoogleSheetsConfigError') throw error;
      console.warn(`[google-sheets] Could not check tab "${this.sheetName}" at startup: ${error.message}`);
      return;
    }
    const missing = this.columns.filter((c) => !c.optional && !headers.includes(c.header)).map((c) => c.header);
    if (missing.length) {
      throw new Error(`Google Sheets tab "${this.sheetName}" is missing column(s): ${missing.join(', ')}`);
    }
  }

  // ---------- Public API ----------

  async findAll() {
    return (await this.#load()).rows.map(({ record }) => record);
  }

  async findById(id) {
    return (await this.#load()).rows.find(({ record }) => record.id === id)?.record ?? null;
  }

  async create(input) {
    return this.#withLock(async () => {
      const { headers, rows } = await this.#load({ fresh: true });
      const data = typeof input === 'function' ? input(rows.map((r) => r.record)) : input;
      const now = new Date().toISOString();
      const record = { ...this.#pick(data), id: this.#nextId(rows), createdAt: now, updatedAt: now };

      await this.#call((sheets) =>
        sheets.spreadsheets.values.append({
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          range: `${this.#quotedName()}!A1`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: { values: [this.#toRow(record, headers)] },
        }),
      );
      this.cache = null;
      return record;
    });
  }

  /** `input`: data object or `(existing) => data`. Returns null if the id doesn't exist. */
  async update(id, input) {
    return this.#withLock(async () => {
      const { headers, rows } = await this.#load({ fresh: true });
      const found = rows.find(({ record }) => record.id === id);
      if (!found) return null;

      const data = typeof input === 'function' ? input(found.record) : input;
      const record = { ...found.record, ...this.#pick(data), id: found.record.id, createdAt: found.record.createdAt, updatedAt: new Date().toISOString() };
      const lastColumn = columnLetter(headers.length - 1);

      await this.#call((sheets) =>
        sheets.spreadsheets.values.update({
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          range: `${this.#quotedName()}!A${found.rowNumber}:${lastColumn}${found.rowNumber}`,
          valueInputOption: 'RAW',
          // Start from the existing cells so extra columns added by the owner are kept.
          requestBody: { values: [this.#toRow(record, headers, found.raw)] },
        }),
      );
      this.cache = null;
      return record;
    });
  }

  /**
   * Replaces all data rows below the header (used by backup restore).
   * The header row is kept; everything under it is cleared first.
   */
  async replaceAll(records) {
    return this.#withLock(async () => {
      const { headers } = await this.#load({ fresh: true });
      const lastColumn = columnLetter(Math.max(headers.length, 26) - 1);
      await this.#call((sheets) =>
        sheets.spreadsheets.values.clear({
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          range: `${this.#quotedName()}!A2:${lastColumn}`,
        }),
      );
      if (records.length) {
        await this.#call((sheets) =>
          sheets.spreadsheets.values.update({
            spreadsheetId: googleSheetsConfig.spreadsheetId,
            range: `${this.#quotedName()}!A2`,
            valueInputOption: 'RAW',
            requestBody: { values: records.map((record) => this.#toRow(record, headers)) },
          }),
        );
      }
      this.cache = null;
    });
  }

  /** Returns true if a row was deleted. */
  async delete(id) {
    return this.#withLock(async () => {
      const { rows } = await this.#load({ fresh: true });
      const found = rows.find(({ record }) => record.id === id);
      if (!found) return false;

      const sheetId = await this.#getSheetId();
      await this.#call((sheets) =>
        sheets.spreadsheets.batchUpdate({
          spreadsheetId: googleSheetsConfig.spreadsheetId,
          requestBody: {
            requests: [
              { deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: found.rowNumber - 1, endIndex: found.rowNumber } } },
            ],
          },
        }),
      );
      this.cache = null;
      return true;
    });
  }

  // ---------- Internals ----------

  #withLock(task) {
    return sheetLocks.run(this.#lockKey, task);
  }

  async #call(request) {
    try {
      return await request(getSheetsClient());
    } catch (error) {
      throw toApiError(error);
    }
  }

  #quotedName() {
    return `'${this.sheetName.replace(/'/g, "''")}'`;
  }

  /** Reads the whole tab: header row + data rows with their sheet row numbers. */
  async #load({ fresh = false } = {}) {
    if (!fresh && this.cache && Date.now() - this.cache.at < this.cacheMs) return this.cache;

    const res = await this.#call((sheets) =>
      sheets.spreadsheets.values.get({
        spreadsheetId: googleSheetsConfig.spreadsheetId,
        range: this.#quotedName(),
        valueRenderOption: 'UNFORMATTED_VALUE',
      }),
    );
    const [headerRow = [], ...dataRows] = res.data.values ?? [];
    const headers = headerRow.map((h) => String(h).trim());
    const indexOf = new Map(this.columns.map((c) => [c.key, headers.indexOf(c.header)]));

    const rows = [];
    dataRows.forEach((raw, i) => {
      const record = {};
      for (const column of this.columns) {
        const index = indexOf.get(column.key);
        const value = index >= 0 ? raw[index] : undefined;
        if (column.type === 'number') record[column.key] = Number(value) || 0;
        else record[column.key] = value === undefined || value === null ? '' : String(value).trim();
      }
      if (this.idPattern.test(record.id)) rows.push({ record, raw, rowNumber: i + 2 });
    });

    this.cache = { at: Date.now(), headers, rows };
    return this.cache;
  }

  async #getSheetId() {
    if (this.sheetId !== null) return this.sheetId;
    const res = await this.#call((sheets) =>
      sheets.spreadsheets.get({ spreadsheetId: googleSheetsConfig.spreadsheetId, fields: 'sheets.properties(sheetId,title)' }),
    );
    const sheet = res.data.sheets?.find((s) => s.properties.title === this.sheetName);
    if (!sheet) throw new ApiError(503, `Google Sheets tab "${this.sheetName}" not found.`);
    this.sheetId = sheet.properties.sheetId;
    return this.sheetId;
  }

  /** Record -> row values in the sheet's header order (unmapped columns keep `base` values). */
  #toRow(record, headers, base = []) {
    return headers.map((header, i) => {
      const column = this.columns.find((c) => c.header === header);
      if (!column) return base[i] ?? '';
      const value = record[column.key];
      return value === undefined || value === null ? '' : value;
    });
  }

  #pick(data) {
    const record = {};
    for (const { key } of this.columns) {
      if (!['id', 'createdAt', 'updatedAt'].includes(key) && data[key] !== undefined) record[key] = data[key];
    }
    return record;
  }

  #nextId(rows) {
    const max = rows.reduce((highest, { record }) => Math.max(highest, Number(this.idPattern.exec(record.id)?.[1] ?? 0)), 0);
    return `${this.idPrefix}-${String(max + 1).padStart(4, '0')}`;
  }
}
