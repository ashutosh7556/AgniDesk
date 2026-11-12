/**
 * One-time copy of everything still in the old local Excel files
 * (backend/data/*.xlsx) into the Google Sheets tabs, keeping IDs.
 *
 * - Copies only records whose ID is not already in the sheet (safe to re-run).
 * - Never modifies or deletes the Excel files (they stay as a backup).
 * - Afterwards refreshes the display columns (Stock, PaidAmount, InvoiceItems...).
 *
 * Customers and users were moved earlier with their own scripts.
 * Usage (from backend/):  npm run migrate:all-to-sheets
 */
import * as legacy from './legacyExcelStores.js';
import * as sheets from '../src/storage/stores.js';
import { syncAllSheetsNow } from '../src/services/sheetSync.service.js';

const PAIRS = [
  ['Products', legacy.productStore, sheets.productStore],
  ['Stock movements', legacy.stockMovementStore, sheets.stockMovementStore],
  ['Quotations', legacy.quotationStore, sheets.quotationStore],
  ['Invoices', legacy.invoiceStore, sheets.invoiceStore],
  ['Payments', legacy.paymentStore, sheets.paymentStore],
  ['Expenses', legacy.expenseStore, sheets.expenseStore],
  ['Services', legacy.serviceStore, sheets.serviceStore],
  ['Settings', legacy.settingsStore, sheets.settingsStore],
];

async function main() {
  await sheets.initStores();
  let total = 0;
  for (const [label, excel, sheet] of PAIRS) {
    const [local, online] = await Promise.all([excel.findAll(), sheet.findAll()]);
    const existing = new Set(online.map((r) => r.id));
    const toCopy = local.filter((r) => !existing.has(r.id));
    // Keep existing sheet rows, add the missing local ones (original IDs and timestamps).
    if (toCopy.length) await sheet.replaceAll([...online, ...toCopy]);
    console.log(`${label.padEnd(16)} local ${String(local.length).padStart(3)} | already online ${String(local.length - toCopy.length).padStart(3)} | copied ${toCopy.length}`);
    total += toCopy.length;
  }
  await syncAllSheetsNow();
  console.log(`✓ Copied ${total} record(s) to Google Sheets and refreshed display columns. Local Excel files were not changed.`);
}

main().catch((error) => {
  console.error(`✗ Migration failed: ${error.message}`);
  process.exitCode = 1;
});
