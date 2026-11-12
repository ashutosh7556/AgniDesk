import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import {
  customerStore,
  expenseStore,
  invoiceStore,
  paymentStore,
  productStore,
  quotationStore,
  serviceStore,
  settingsStore,
  stockMovementStore,
} from '../storage/stores.js';
import { ApiError } from '../utils/ApiError.js';
import { loadSettings } from './settings.service.js';
import { syncAllSheetsNow } from './sheetSync.service.js';

/**
 * Full backup / restore as ONE .xlsx file:
 *   - "About" sheet: app name, format version, created time, record counts
 *   - one sheet per entity; row 1 = field keys, then one row per record
 *     (JSON fields such as line items are stored as JSON text)
 *
 * Includes customers from Google Sheets. Login accounts (users) are NOT
 * included on purpose: a backup file must never be able to reset the owner's
 * password or leak its hash.
 *
 * Restore replaces each entity found in the file. Before writing anything,
 * a snapshot of the current data is saved to BACKUP_DIR when the disk allows
 * (best effort), and the frontend downloads a safety backup first.
 */

const FORMAT_VERSION = 1;
const BACKUP_DIR = path.resolve(process.env.BACKUP_DIR || './backups');

const ENTITIES = [
  { key: 'customers', label: 'Customers (Google Sheets)', store: customerStore },
  { key: 'products', label: 'Products', store: productStore },
  { key: 'stock_movements', label: 'Stock movements', store: stockMovementStore },
  { key: 'quotations', label: 'Quotations', store: quotationStore },
  { key: 'invoices', label: 'Invoices', store: invoiceStore },
  { key: 'payments', label: 'Payments', store: paymentStore },
  { key: 'expenses', label: 'Expenses', store: expenseStore },
  { key: 'services', label: 'Services', store: serviceStore },
  { key: 'settings', label: 'Settings', store: settingsStore },
];

const timestamp = () => new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

/** @returns {Promise<{ buffer: Buffer, fileName: string, counts: object }>} */
export async function createBackup() {
  const data = await Promise.all(ENTITIES.map((e) => e.store.findAll()));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'AgniDesk';

  const about = workbook.addWorksheet('About');
  about.columns = [{ width: 28 }, { width: 40 }];
  about.addRows([
    ['App', 'AgniDesk'],
    ['Backup format', FORMAT_VERSION],
    ['Created at', new Date().toISOString()],
    ['Note', 'Restore this file from AgniDesk > Settings > Backup & Restore. Do not edit sheet names or the first row.'],
    [],
    ['Entity', 'Records'],
  ]);
  about.getRow(1).font = { bold: true };

  const counts = {};
  ENTITIES.forEach((entity, i) => {
    const rows = data[i];
    counts[entity.key] = rows.length;
    about.addRow([entity.label, rows.length]);

    const sheet = workbook.addWorksheet(entity.key);
    const keys = entity.store.columns.map((c) => c.key);
    sheet.addRow(keys);
    sheet.getRow(1).font = { bold: true };
    for (const record of rows) {
      sheet.addRow(entity.store.columns.map((c) => (c.type === 'json' ? JSON.stringify(record[c.key] ?? c.default ?? null) : record[c.key] ?? '')));
    }
    sheet.views = [{ state: 'frozen', ySplit: 1 }];
  });

  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  return { buffer, fileName: `AgniDesk-backup-${timestamp()}.xlsx`, counts };
}

const cellText = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    if ('result' in value) return cellText(value.result);
    if ('text' in value) return cellText(value.text);
    if (Array.isArray(value.richText)) return value.richText.map((p) => p.text).join('');
  }
  return value;
};

function parseEntitySheet(sheet, entity) {
  const keys = [];
  sheet.getRow(1).eachCell((cell, col) => {
    keys[col] = String(cellText(cell.value)).trim();
  });
  const columnsByKey = new Map(entity.store.columns.map((c) => [c.key, c]));
  if (!keys.includes('id')) throw new ApiError(400, `Backup sheet "${entity.key}" is missing its "id" column.`);

  const records = [];
  const seen = new Set();
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const record = {};
    keys.forEach((key, col) => {
      const column = columnsByKey.get(key);
      if (!column) return; // unknown column: ignore
      const raw = cellText(row.getCell(col).value);
      if (column.type === 'number') record[key] = raw === '' ? 0 : Number(raw) || 0;
      else if (column.type === 'json') {
        try {
          record[key] = raw === '' ? structuredClone(column.default ?? null) : JSON.parse(String(raw));
        } catch {
          throw new ApiError(400, `Backup sheet "${entity.key}", row ${rowNumber}: column "${key}" is not valid JSON.`);
        }
      } else record[key] = String(raw).trim();
    });
    if (!record.id) return;
    if (seen.has(record.id)) throw new ApiError(400, `Backup sheet "${entity.key}" has a duplicate id: ${record.id}.`);
    seen.add(record.id);
    records.push(record);
  });
  return records;
}

/**
 * @param {Buffer} buffer uploaded .xlsx
 * @param {{ includeCustomers: boolean }} options
 */
export async function restoreBackup(buffer, { includeCustomers }) {
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    throw new ApiError(400, 'This file is not a valid Excel (.xlsx) file.');
  }

  const about = workbook.getWorksheet('About');
  const appName = about && cellText(about.getCell('B1').value);
  if (appName !== 'AgniDesk') throw new ApiError(400, 'This is not an AgniDesk backup file (missing "About" sheet).');
  const version = Number(cellText(about.getCell('B2').value));
  if (version > FORMAT_VERSION) throw new ApiError(400, 'This backup was made by a newer version of AgniDesk.');

  // Parse and validate everything BEFORE writing anything.
  const plan = [];
  const skipped = [];
  for (const entity of ENTITIES) {
    const sheet = workbook.getWorksheet(entity.key);
    if (!sheet) {
      skipped.push({ entity: entity.label, reason: 'not in backup file' });
      continue;
    }
    if (entity.key === 'customers' && !includeCustomers) {
      skipped.push({ entity: entity.label, reason: 'not selected' });
      continue;
    }
    plan.push({ entity, records: parseEntitySheet(sheet, entity) });
  }
  if (!plan.length) throw new ApiError(400, 'Nothing to restore in this file.');

  // Safety net (best effort): snapshot of the current data on the server's disk.
  // Hosted servers may have no permanent disk, so the frontend ALSO downloads a
  // backup to the owner's computer before calling restore.
  let snapshotFile = '';
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const snapshot = await createBackup();
    snapshotFile = `AgniDesk-before-restore-${timestamp()}.xlsx`;
    await fs.writeFile(path.join(BACKUP_DIR, snapshotFile), snapshot.buffer);
  } catch (error) {
    console.warn(`[backup] Could not save server snapshot before restore: ${error.message}`);
    snapshotFile = '';
  }

  const restored = [];
  for (const { entity, records } of plan) {
    await entity.store.replaceAll(records);
    restored.push({ entity: entity.label, records: records.length });
  }
  await loadSettings();
  await syncAllSheetsNow();

  return { restored, skipped, snapshotFile, snapshotFolder: BACKUP_DIR };
}
