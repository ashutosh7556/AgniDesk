/** LEGACY (pre-Google-Sheets) Excel store definitions. Used ONLY by scripts/migrateAllToSheets.js. */
import { env } from '../src/config/env.js';
import { ExcelStore } from '../src/storage/ExcelStore.js';
import { DEFAULT_GST_RATE } from '../src/config/business.js';

/**
 * Workbook definitions — one file per entity inside DATA_DIR.
 * Headers are what the owner sees when opening the file in Excel.
 */





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
    // Available stock is CALCULATED (opening + adjustments − invoiced), never stored.
    { key: 'openingStock', header: 'Opening Stock', type: 'number', width: 15, aliases: ['Available Quantity', 'quantity'] },
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
    // Amount paid is CALCULATED from payments.xlsx, never stored here.
    ...billingDocumentColumns.slice(2),
  ],
});

/** Manual stock changes (purchases received, corrections). Sales come from invoices. */
export const stockMovementStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'stock_movements.xlsx',
  sheetName: 'Stock Movements',
  idPrefix: 'STK',
  columns: [
    { key: 'date', header: 'Date', type: 'string', width: 12 },
    { key: 'productId', header: 'Product ID', type: 'string', width: 12 },
    { key: 'productName', header: 'Product Name', type: 'string', width: 32 },
    { key: 'type', header: 'Type', type: 'string', width: 12 }, // purchase | adjustment
    { key: 'quantity', header: 'Quantity (+/-)', type: 'number', width: 14 },
    { key: 'note', header: 'Note', type: 'string', width: 40 },
  ],
});

export const paymentStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'payments.xlsx',
  sheetName: 'Payments',
  idPrefix: 'PAY',
  columns: [
    { key: 'date', header: 'Date', type: 'string', width: 12 },
    { key: 'invoiceId', header: 'Invoice ID', type: 'string', width: 12 },
    { key: 'invoiceNumber', header: 'Invoice Number', type: 'string', width: 18 },
    { key: 'customerId', header: 'Customer ID', type: 'string', width: 12 },
    { key: 'customerName', header: 'Customer Name', type: 'string', width: 28 },
    { key: 'amount', header: 'Amount', type: 'number', width: 14 },
    { key: 'mode', header: 'Mode', type: 'string', width: 14 },
    { key: 'reference', header: 'Reference', type: 'string', width: 22 },
    { key: 'note', header: 'Note', type: 'string', width: 30 },
  ],
});

export const expenseStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'expenses.xlsx',
  sheetName: 'Expenses',
  idPrefix: 'EXP',
  columns: [
    { key: 'date', header: 'Date', type: 'string', width: 12 },
    { key: 'title', header: 'Expense Title', type: 'string', width: 32 },
    { key: 'category', header: 'Category', type: 'string', width: 20 },
    { key: 'amount', header: 'Amount', type: 'number', width: 14 },
    { key: 'description', header: 'Description', type: 'string', width: 44 },
  ],
});

/** Fire safety service visits. Certificate number is assigned when a service is completed. */
export const serviceStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'services.xlsx',
  sheetName: 'Services',
  idPrefix: 'SRV',
  columns: [
    { key: 'serviceDate', header: 'Service Date', type: 'string', width: 12 },
    { key: 'customerId', header: 'Customer ID', type: 'string', width: 12 },
    { key: 'customerName', header: 'Customer Name', type: 'string', width: 28 },
    { key: 'serviceType', header: 'Service Type', type: 'string', width: 28 },
    { key: 'status', header: 'Status', type: 'string', width: 12, default: 'scheduled' },
    { key: 'nextDueDate', header: 'Next Due Date', type: 'string', width: 13 },
    { key: 'charges', header: 'Charges', type: 'number', width: 12 },
    { key: 'technician', header: 'Technician', type: 'string', width: 18 },
    { key: 'siteAddress', header: 'Site Address', type: 'string', width: 40 },
    { key: 'remarks', header: 'Remarks', type: 'string', width: 40 },
    { key: 'certificateNumber', header: 'Certificate No.', type: 'string', width: 18 },
    { key: 'completedAt', header: 'Completed At', type: 'string', width: 22 },
    { key: 'customer', header: 'Customer Snapshot (JSON)', type: 'json', width: 40, default: {} },
    { key: 'equipment', header: 'Equipment (JSON)', type: 'json', width: 50, default: [] },
  ],
});

/** Business settings as key/value rows (one row per setting). */
export const settingsStore = new ExcelStore({
  dataDir: env.dataDir,
  fileName: 'settings.xlsx',
  sheetName: 'Settings',
  idPrefix: 'SET',
  columns: [
    { key: 'key', header: 'Setting', type: 'string', width: 26 },
    { key: 'value', header: 'Value', type: 'string', width: 80 },
  ],
});
