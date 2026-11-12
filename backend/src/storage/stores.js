import { env } from '../config/env.js';
import { ExcelStore } from './ExcelStore.js';

/**
 * Workbook definitions — one file per entity inside DATA_DIR.
 * Headers are what the owner sees when opening the file in Excel.
 */

export const userStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'users.xlsx',
  sheetName: 'Users',
  idPrefix: 'USR',
  columns: [
    { key: 'name', header: 'Name', type: 'string', width: 24 },
    { key: 'email', header: 'Email', type: 'string', width: 32 },
    { key: 'passwordHash', header: 'Password Hash', type: 'string', width: 64 },
    { key: 'role', header: 'Role', type: 'string', width: 12 },
  ],
});

export const customerStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'customers.xlsx',
  sheetName: 'Customers',
  idPrefix: 'CUS',
  columns: [
    { key: 'name', header: 'Customer Name', type: 'string', width: 26 },
    { key: 'companyName', header: 'Company Name', type: 'string', width: 28 },
    { key: 'mobile', header: 'Mobile', type: 'string', width: 16 },
    { key: 'email', header: 'Email', type: 'string', width: 30 },
    { key: 'address', header: 'Address', type: 'string', width: 44 },
    { key: 'gstNumber', header: 'GST Number', type: 'string', width: 18 },
  ],
});

export const productStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'products.xlsx',
  sheetName: 'Products',
  idPrefix: 'PRD',
  columns: [
    { key: 'name', header: 'Product Name', type: 'string', width: 34 },
    { key: 'category', header: 'Category', type: 'string', width: 18 },
    { key: 'purchasePrice', header: 'Purchase Price', type: 'number', width: 15 },
    { key: 'sellingPrice', header: 'Selling Price', type: 'number', width: 15 },
    { key: 'quantity', header: 'Available Quantity', type: 'number', width: 18 },
    { key: 'lowStockThreshold', header: 'Low Stock Alert At', type: 'number', width: 18 },
  ],
});

/** Ensures the data folder and every workbook exist. Called once at startup. */
export const initStores = () =>
  Promise.all([userStore.init(), customerStore.init(), productStore.init()]);
