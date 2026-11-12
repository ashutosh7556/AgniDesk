/**
 * Google Sheets smoke test for the "Customers" sheet.
 *
 * Standalone: does NOT use or change the app's customer module or Excel storage.
 *   1. verifies the connection
 *   2. reads the header row (columns are matched by name, so column order doesn't matter)
 *   3. appends one clearly-marked test customer row
 *   4. reads that exact row back and compares every field
 *
 * Usage (from backend/):
 *   npm run test:sheets-customers               keep the test row so you can see it in the sheet
 *   npm run test:sheets-customers -- --cleanup  delete the test row afterwards
 */
import { getSheetsClient, googleSheetsConfig, verifyGoogleSheetsConnection } from '../src/config/googleSheets.js';

const SHEET_NAME = 'Customers';
const REQUIRED_HEADERS = ['CustomerID', 'Name', 'Company', 'Mobile', 'Email', 'Address', 'GSTNumber', 'CreatedAt'];
const cleanup = process.argv.includes('--cleanup');

const log = (symbol, message) => console.log(`${symbol} ${message}`);

async function main() {
  const sheets = getSheetsClient();
  const { spreadsheetId } = googleSheetsConfig;

  // 1. Connection
  const info = await verifyGoogleSheetsConnection();
  log('✓', `Connected to spreadsheet "${info.title}"`);
  if (!info.sheets.includes(SHEET_NAME)) throw new Error(`Sheet "${SHEET_NAME}" not found. Sheets: ${info.sheets.join(', ')}`);

  // 2. Header row
  const headerRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAME}!1:1` });
  const headers = (headerRes.data.values?.[0] ?? []).map((h) => String(h).trim());
  const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missing.length) throw new Error(`Missing header(s) in ${SHEET_NAME}: ${missing.join(', ')}`);
  log('✓', `Header row: ${headers.join(' | ')}`);

  // 3. Append a test row (values ordered to match the sheet's actual header order)
  const stamp = Date.now();
  const testCustomer = {
    CustomerID: `TEST-${stamp}`,
    Name: 'Test Customer (AgniDesk Sheets test)',
    Company: 'Test Company Pvt Ltd',
    Mobile: '9876543210',
    Email: 'test.customer@example.com',
    Address: 'Test address, Surat',
    GSTNumber: '24AAACS1234A1Z5',
    CreatedAt: new Date().toISOString(),
  };
  const rowValues = headers.map((h) => testCustomer[h] ?? '');

  const appendRes = await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${SHEET_NAME}!A1`,
    // RAW: stored exactly as sent — keeps mobile numbers as text and prevents
    // any value starting with "=" from being executed as a formula.
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowValues] },
  });
  const updatedRange = appendRes.data.updates?.updatedRange; // e.g. "Customers!A2:H2"
  const rowNumber = Number(updatedRange?.match(/!A?(\d+)/)?.[1]);
  log('✓', `Appended test row ${testCustomer.CustomerID} at ${updatedRange}`);

  // 4. Read the same row back and compare
  const readRes = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${SHEET_NAME}!${rowNumber}:${rowNumber}` });
  const readValues = readRes.data.values?.[0] ?? [];
  const readBack = Object.fromEntries(headers.map((h, i) => [h, readValues[i] ?? '']));
  const mismatches = REQUIRED_HEADERS.filter((h) => String(readBack[h]) !== String(testCustomer[h]));
  if (mismatches.length) {
    throw new Error(`Read-back mismatch in: ${mismatches.map((h) => `${h} (sent "${testCustomer[h]}", got "${readBack[h]}")`).join('; ')}`);
  }
  log('✓', `Read back row ${rowNumber}; all ${REQUIRED_HEADERS.length} fields match:`);
  console.table(readBack);

  // Optional cleanup: delete the test row
  if (cleanup) {
    const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: 'sheets.properties(sheetId,title)' });
    const sheetId = meta.data.sheets.find((s) => s.properties.title === SHEET_NAME).properties.sheetId;
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } }],
      },
    });
    log('✓', `Cleanup: deleted test row ${rowNumber}`);
  } else {
    log('ℹ', `Test row kept. Open the "${SHEET_NAME}" sheet and look for ${testCustomer.CustomerID} on row ${rowNumber}.`);
    log('ℹ', 'Run again with "-- --cleanup" to remove test rows automatically, or delete the row in Google Sheets.');
  }
}

main().catch((error) => {
  console.error(`✗ Google Sheets customer test failed: ${error.message}`);
  process.exitCode = 1;
});
