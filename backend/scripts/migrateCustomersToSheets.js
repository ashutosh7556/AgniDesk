/**
 * One-time copy of customers from the old Excel file (backend/data/customers.xlsx)
 * to the Google Sheets "Customers" tab.
 *
 * - Keeps the original IDs (CUS-0001...), so existing quotations/invoices/services
 *   that reference them keep pointing at the right customer.
 * - Skips customers whose ID already exists in the sheet, so running it twice is safe.
 * - Never modifies or deletes the Excel file (it stays as a backup).
 *
 * Usage (from backend/):  npm run migrate:customers-to-sheets
 */
import path from 'node:path';
import { ExcelStore } from '../src/storage/ExcelStore.js';
import { getSheetsClient, googleSheetsConfig } from '../src/config/googleSheets.js';
import { customerStore } from '../src/storage/stores.js';

const legacyExcel = new ExcelStore({
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  fileName: 'customers.xlsx',
  sheetName: 'Customers',
  idPrefix: 'CUS',
  columns: [
    { key: 'name', header: 'Customer Name', type: 'string' },
    { key: 'companyName', header: 'Company Name', type: 'string' },
    { key: 'mobile', header: 'Mobile', type: 'string' },
    { key: 'email', header: 'Email', type: 'string' },
    { key: 'address', header: 'Address', type: 'string' },
    { key: 'gstNumber', header: 'GST Number', type: 'string' },
  ],
});

async function main() {
  await customerStore.init();
  const [excelCustomers, sheetCustomers] = await Promise.all([legacyExcel.findAll(), customerStore.findAll()]);
  const existingIds = new Set(sheetCustomers.map((c) => c.id));
  const toCopy = excelCustomers.filter((c) => !existingIds.has(c.id));

  console.log(`Excel customers: ${excelCustomers.length} | already in sheet: ${excelCustomers.length - toCopy.length} | to copy: ${toCopy.length}`);
  if (toCopy.length === 0) return console.log('✓ Nothing to copy.');

  // Read the sheet's header order and append rows in that order (RAW = stored exactly as sent).
  const sheets = getSheetsClient();
  const { spreadsheetId } = googleSheetsConfig;
  const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: 'Customers!1:1' });
  const headers = (headerRes.data.values?.[0] ?? []).map((h) => String(h).trim());
  const fieldFor = {
    CustomerID: 'id', Name: 'name', Company: 'companyName', Mobile: 'mobile', Email: 'email',
    Address: 'address', GSTNumber: 'gstNumber', CreatedAt: 'createdAt', UpdatedAt: 'updatedAt',
  };
  const rows = toCopy.map((c) => headers.map((h) => (fieldFor[h] ? c[fieldFor[h]] ?? '' : '')));

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Customers!A1',
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: rows },
  });
  toCopy.forEach((c) => console.log(`  + ${c.id}  ${c.name}`));
  console.log(`✓ Copied ${toCopy.length} customer(s) to Google Sheets. The Excel file was not changed.`);
}

main().catch((error) => {
  console.error(`✗ Migration failed: ${error.message}`);
  process.exitCode = 1;
});
