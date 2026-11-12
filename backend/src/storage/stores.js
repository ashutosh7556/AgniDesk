import { env } from '../config/env.js';
import { ExcelStore } from './ExcelStore.js';
import { DEFAULT_GST_RATE } from '../config/business.js';

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
    // Added in Phase 3; existing rows read the defaults until edited.
    { key: 'hsnCode', header: 'HSN/SAC Code', type: 'string', width: 14 },
    { key: 'gstRate', header: 'GST %', type: 'number', width: 8, default: DEFAULT_GST_RATE },
  ],
});

/**
 * Columns shared by quotations and invoices. Totals are flattened into their
 * own columns so the workbook is readable in Excel; line items and the
 * customer snapshot are JSON text.
 *
 * The customer snapshot freezes the billing details at the time of issue,
 * so later edits to the customer record never change past documents.
 */
const billingDocumentColumns = [
  { key: 'number', header: 'Number', type: 'string', width: 18 },
  { key: 'date', header: 'Date', type: 'string', width: 12 },
  { key: 'customerId', header: 'Customer ID', type: 'string', width: 12 },
  { key: 'customerName', header: 'Customer Name', type: 'string', width: 28 },
  { key: 'taxMode', header: 'Tax Mode', type: 'string', width: 10 },
  { key: 'supplyType', header: 'Supply Type', type: 'string', width: 11 },
  { key: 'subtotal', header: 'Subtotal', type: 'number', width: 13 },
  { key: 'discountTotal', header: 'Discount', type: 'number', width: 12 },
  { key: 'taxableTotal', header: 'Taxable Value', type: 'number', width: 14 },
  { key: 'cgstTotal', header: 'CGST', type: 'number', width: 11 },
  { key: 'sgstTotal', header: 'SGST', type: 'number', width: 11 },
  { key: 'igstTotal', header: 'IGST', type: 'number', width: 11 },
  { key: 'taxTotal', header: 'Total Tax', type: 'number', width: 12 },
  { key: 'roundOff', header: 'Round Off', type: 'number', width: 10 },
  { key: 'grandTotal', header: 'Grand Total', type: 'number', width: 14 },
  { key: 'notes', header: 'Notes', type: 'string', width: 30 },
  { key: 'customer', header: 'Customer Snapshot (JSON)', type: 'json', width: 40, default: {} },
  { key: 'items', header: 'Line Items (JSON)', type: 'json', width: 60, default: [] },
];

export const quotationStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'quotations.xlsx',
  sheetName: 'Quotations',
  idPrefix: 'QTN',
  columns: [
    ...billingDocumentColumns.slice(0, 2),
    { key: 'validUntil', header: 'Valid Until', type: 'string', width: 12 },
    ...billingDocumentColumns.slice(2),
    { key: 'terms', header: 'Terms & Conditions', type: 'string', width: 40 },
  ],
});

export const invoiceStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'invoices.xlsx',
  sheetName: 'Invoices',
  idPrefix: 'IVC',
  columns: [
    ...billingDocumentColumns.slice(0, 2),
    { key: 'invoiceType', header: 'Invoice Type', type: 'string', width: 12 },
    { key: 'status', header: 'Status', type: 'string', width: 11, default: 'active' },
    ...billingDocumentColumns.slice(2),
    { key: 'amountPaid', header: 'Amount Paid', type: 'number', width: 14 },
  ],
});

/** Ensures the data folder and every workbook exist. Called once at startup. */
export const initStores = () =>
  Promise.all([
    userStore.init(),
    customerStore.init(),
    productStore.init(),
    quotationStore.init(),
    invoiceStore.init(),
  ]);
