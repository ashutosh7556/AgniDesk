/**
 * One-time move of login accounts from backend/data/users.xlsx to the Google
 * Sheets "Users" tab, keeping IDs and bcrypt password hashes (everyone keeps
 * their current password).
 *
 * Safety: refuses to run if the sheet contains an account that is NOT in the
 * Excel file (so it can never wipe accounts created in the sheet), unless
 * --force is given. The Excel file is never modified.
 *
 * Usage (from backend/):  npm run migrate:users-to-sheets
 */
import path from 'node:path';
import { ExcelStore } from '../src/storage/ExcelStore.js';
import { userStore } from '../src/storage/stores.js';

const legacyExcel = new ExcelStore({
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  fileName: 'users.xlsx',
  sheetName: 'Users',
  idPrefix: 'USR',
  columns: [
    { key: 'name', header: 'Name', type: 'string' },
    { key: 'email', header: 'Email', type: 'string' },
    { key: 'passwordHash', header: 'Password Hash', type: 'string' },
    { key: 'role', header: 'Role', type: 'string' },
    { key: 'passwordChangedAt', header: 'Password Changed At', type: 'string' },
  ],
});

async function main() {
  await userStore.init();
  const [excelUsers, sheetUsers] = await Promise.all([legacyExcel.findAll(), userStore.findAll()]);
  console.log(`Excel accounts: ${excelUsers.length} | accounts in sheet: ${sheetUsers.length}`);
  if (excelUsers.length === 0) return console.log('✓ No accounts in users.xlsx — nothing to move.');

  const excelIds = new Set(excelUsers.map((u) => u.id));
  const unknown = sheetUsers.filter((u) => !excelIds.has(u.id));
  if (unknown.length && !process.argv.includes('--force')) {
    console.error(`✗ The sheet already has account(s) not in users.xlsx: ${unknown.map((u) => `${u.id} ${u.email}`).join(', ')}.`);
    console.error('  Nothing was changed. Re-run with "-- --force" only if you want to replace them.');
    process.exitCode = 1;
    return;
  }

  // Sheet accounts with the same ID (e.g. the owner auto-created at startup) are
  // replaced by the original Excel record so the original password keeps working.
  await userStore.replaceAll(excelUsers.map((u) => ({ ...u, passwordChangedAt: u.passwordChangedAt || '' })));
  excelUsers.forEach((u) => console.log(`  ✓ ${u.id}  ${u.email}  (${u.role})`));
  console.log(`✓ Moved ${excelUsers.length} account(s) to Google Sheets. users.xlsx was not changed (kept as backup).`);
}

main().catch((error) => {
  console.error(`✗ Migration failed: ${error.message}`);
  process.exitCode = 1;
});
