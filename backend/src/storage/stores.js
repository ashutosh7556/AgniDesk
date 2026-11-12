import { GoogleSheetsStore } from './GoogleSheetsStore.js';
import { DEFAULT_GST_RATE } from '../config/business.js';

/**
 * ALL business data is stored in Google Sheets — one tab per entity.
 * Nothing is stored on the server's disk, so the backend can be deployed
 * without persistent storage.
 *
 * Columns that already exist in the owner's spreadsheet are used as-is
 * (matched by header name). Extra columns the app needs are marked
 * `autoCreate` and appended to the END of the header row at startup —
 * existing columns and data are never moved or changed.
 *
 * Derived "display" columns kept up to date automatically by the app
 * (see services/sheetSync.service.js): Products.Stock, Invoices.PaidAmount,
 * Invoices.PaymentStatus and the InvoiceItems tab.
 *
 * Tab names can be overridden with GOOGLE_SHEETS_<NAME>_TAB (used for testing).
 */
const tab = (name, fallback) => process.env[`GOOGLE_SHEETS_${name}_TAB`] || fallback;
const timestamps = [
  { key: 'createdAt', header: 'CreatedAt', type: 'string', autoCreate: true },
  { key: 'updatedAt', header: 'UpdatedAt', type: 'string', autoCreate: true },
];

/**
 * Login accounts. PasswordHash is bcrypt (never plain text).
 * SECURITY: anyone with access to the spreadsheet can see hashes and edit
 * roles — share it only with the service account and the admins.
 */
export const userStore = new GoogleSheetsStore({
  sheetName: tab('USERS', 'Users'),
  idPrefix: 'USR',
  columns: [
    { key: 'id', header: 'UserID', type: 'string' },
    { key: 'name', header: 'Name', type: 'string' },
    { key: 'email', header: 'Email', type: 'string' },
    { key: 'passwordHash', header: 'PasswordHash', type: 'string' },
    { key: 'role', header: 'Role', type: 'string' },
    { key: 'createdAt', header: 'CreatedAt', type: 'string' },
    // Tokens issued before this moment are rejected (reset/removal signs the person out).
    { key: 'passwordChangedAt', header: 'PasswordChangedAt', type: 'string', autoCreate: true },
    { key: 'updatedAt', header: 'UpdatedAt', type: 'string', optional: true },
  ],
});

export const customerStore = new GoogleSheetsStore({
  sheetName: tab('CUSTOMERS', 'Customers'),
  idPrefix: 'CUS',
  columns: [
    { key: 'id', header: 'CustomerID', type: 'string' },
    { key: 'name', header: 'Name', type: 'string' },
    { key: 'companyName', header: 'Company', type: 'string' },
    { key: 'mobile', header: 'Mobile', type: 'string' },
    { key: 'email', header: 'Email', type: 'string' },
    { key: 'address', header: 'Address', type: 'string' },
    { key: 'gstNumber', header: 'GSTNumber', type: 'string' },
    { key: 'createdAt', header: 'CreatedAt', type: 'string' },
    { key: 'updatedAt', header: 'UpdatedAt', type: 'string', optional: true },
  ],
});

/** Available stock is CALCULATED (opening + adjustments − invoiced); "Stock" shows it for reading. */
export const productStore = new GoogleSheetsStore({
  sheetName: tab('PRODUCTS', 'Products'),
  idPrefix: 'PRD',
  columns: [
    { key: 'id', header: 'ProductID', type: 'string' },
    { key: 'name', header: 'Name', type: 'string' },
    { key: 'category', header: 'Category', type: 'string' },
    { key: 'purchasePrice', header: 'PurchasePrice', type: 'number' },
    { key: 'sellingPrice', header: 'SellingPrice', type: 'number' },
    { key: 'sheetStock', header: 'Stock', type: 'number' }, // display only, maintained by sheetSync
    { key: 'lowStockThreshold', header: 'LowStockLimit', type: 'number' },
    { key: 'createdAt', header: 'CreatedAt', type: 'string' },
    { key: 'openingStock', header: 'OpeningStock', type: 'number', autoCreate: true },
    { key: 'hsnCode', header: 'HSNCode', type: 'string', autoCreate: true },
    { key: 'gstRate', header: 'GSTRate', type: 'number', default: DEFAULT_GST_RATE, autoCreate: true },
    { key: 'updatedAt', header: 'UpdatedAt', type: 'string', autoCreate: true },
  ],
});

/** Stock received / corrections. Sales come from invoices. (Tab created automatically.) */
export const stockMovementStore = new GoogleSheetsStore({
  sheetName: tab('STOCK_MOVEMENTS', 'StockMovements'),
  idPrefix: 'STK',
  createTab: true,
  columns: [
    { key: 'id', header: 'MovementID', type: 'string' },
    { key: 'date', header: 'Date', type: 'string' },
    { key: 'productId', header: 'ProductID', type: 'string' },
    { key: 'productName', header: 'ProductName', type: 'string' },
    { key: 'type', header: 'Type', type: 'string' }, // purchase | adjustment
    { key: 'quantity', header: 'Quantity', type: 'number' },
    { key: 'note', header: 'Note', type: 'string' },
    ...timestamps,
  ],
});

/**
 * Columns shared by quotations and invoices (appended if missing). Line items
 * and the customer snapshot are JSON in one cell, so a document is always
 * saved in ONE row (never half-saved). The snapshot freezes billing details
 * at the time of issue.
 */
const documentExtraColumns = [
  { key: 'customerName', header: 'CustomerName', type: 'string', autoCreate: true },
  { key: 'taxMode', header: 'TaxMode', type: 'string', autoCreate: true },
  { key: 'supplyType', header: 'SupplyType', type: 'string', autoCreate: true },
  { key: 'taxableTotal', header: 'TaxableValue', type: 'number', autoCreate: true },
  { key: 'cgstTotal', header: 'CGST', type: 'number', autoCreate: true },
  { key: 'sgstTotal', header: 'SGST', type: 'number', autoCreate: true },
  { key: 'igstTotal', header: 'IGST', type: 'number', autoCreate: true },
  { key: 'roundOff', header: 'RoundOff', type: 'number', autoCreate: true },
  { key: 'notes', header: 'Notes', type: 'string', autoCreate: true },
  { key: 'items', header: 'ItemsJSON', type: 'json', default: [], autoCreate: true },
  { key: 'customer', header: 'CustomerJSON', type: 'json', default: {}, autoCreate: true },
  ...timestamps,
];

export const quotationStore = new GoogleSheetsStore({
  sheetName: tab('QUOTATIONS', 'Quotations'),
  idPrefix: 'QTN',
  columns: [
    { key: 'id', header: 'QuotationID', type: 'string' },
    { key: 'customerId', header: 'CustomerID', type: 'string' },
    { key: 'date', header: 'QuotationDate', type: 'string' },
    { key: 'validUntil', header: 'ValidUntil', type: 'string' },
    { key: 'subtotal', header: 'Subtotal', type: 'number' },
    { key: 'discountTotal', header: 'Discount', type: 'number' },
    { key: 'taxTotal', header: 'GST', type: 'number' },
    { key: 'grandTotal', header: 'GrandTotal', type: 'number' },
    { key: 'sheetStatus', header: 'Status', type: 'string', optional: true },
    { key: 'number', header: 'QuotationNumber', type: 'string', autoCreate: true },
    { key: 'terms', header: 'Terms', type: 'string', autoCreate: true },
    ...documentExtraColumns,
  ],
});

/** Amount paid / payment status are CALCULATED from Payments; PaidAmount & PaymentStatus show them. */
export const invoiceStore = new GoogleSheetsStore({
  sheetName: tab('INVOICES', 'Invoices'),
  idPrefix: 'IVC',
  columns: [
    { key: 'id', header: 'InvoiceID', type: 'string' },
    { key: 'customerId', header: 'CustomerID', type: 'string' },
    { key: 'date', header: 'InvoiceDate', type: 'string' },
    { key: 'subtotal', header: 'Subtotal', type: 'number' },
    { key: 'discountTotal', header: 'Discount', type: 'number' },
    { key: 'taxTotal', header: 'GST', type: 'number' },
    { key: 'grandTotal', header: 'GrandTotal', type: 'number' },
    { key: 'sheetPaidAmount', header: 'PaidAmount', type: 'number' }, // display only, maintained by sheetSync
    { key: 'sheetPaymentStatus', header: 'PaymentStatus', type: 'string' }, // display only
    { key: 'number', header: 'InvoiceNumber', type: 'string', autoCreate: true },
    { key: 'invoiceType', header: 'InvoiceType', type: 'string', autoCreate: true },
    { key: 'status', header: 'Status', type: 'string', default: 'active', autoCreate: true },
    ...documentExtraColumns,
  ],
});

/**
 * One readable row per invoice line, REBUILT automatically from the invoices
 * (sheetSync). Edit invoices in AgniDesk; edits made in this tab are overwritten.
 */
export const invoiceItemStore = new GoogleSheetsStore({
  sheetName: tab('INVOICE_ITEMS', 'InvoiceItems'),
  idPrefix: 'ITM',
  idPattern: /^IVC-\d+-(\d+)$/,
  columns: [
    { key: 'id', header: 'ItemID', aliases: ['j'], type: 'string' },
    { key: 'invoiceId', header: 'InvoiceID', type: 'string' },
    { key: 'productId', header: 'ProductID', type: 'string' },
    { key: 'description', header: 'Description', type: 'string' },
    { key: 'quantity', header: 'Quantity', type: 'number' },
    { key: 'rate', header: 'UnitPrice', type: 'number' },
    { key: 'total', header: 'Total', type: 'number' },
    { key: 'invoiceNumber', header: 'InvoiceNumber', type: 'string', autoCreate: true },
    { key: 'hsnCode', header: 'HSN', type: 'string', autoCreate: true },
    { key: 'discountPercent', header: 'DiscountPercent', type: 'number', autoCreate: true },
    { key: 'gstRate', header: 'GSTRate', type: 'number', autoCreate: true },
    { key: 'taxableValue', header: 'TaxableValue', type: 'number', autoCreate: true },
    { key: 'taxAmount', header: 'TaxAmount', type: 'number', autoCreate: true },
  ],
});

export const paymentStore = new GoogleSheetsStore({
  sheetName: tab('PAYMENTS', 'Payments'),
  idPrefix: 'PAY',
  columns: [
    { key: 'id', header: 'PaymentID', type: 'string' },
    { key: 'invoiceId', header: 'InvoiceID', type: 'string' },
    { key: 'customerId', header: 'CustomerID', type: 'string' },
    { key: 'amount', header: 'Amount', type: 'number' },
    { key: 'date', header: 'PaymentDate', type: 'string' },
    { key: 'mode', header: 'PaymentMethod', type: 'string' },
    { key: 'note', header: 'Notes', type: 'string' },
    { key: 'invoiceNumber', header: 'InvoiceNumber', type: 'string', autoCreate: true },
    { key: 'customerName', header: 'CustomerName', type: 'string', autoCreate: true },
    { key: 'reference', header: 'Reference', type: 'string', autoCreate: true },
    ...timestamps,
  ],
});

export const expenseStore = new GoogleSheetsStore({
  sheetName: tab('EXPENSES', 'Expenses'),
  idPrefix: 'EXP',
  columns: [
    { key: 'id', header: 'ExpenseID', type: 'string' },
    { key: 'title', header: 'Title', type: 'string' },
    { key: 'category', header: 'Category', type: 'string' },
    { key: 'amount', header: 'Amount', type: 'number' },
    { key: 'date', header: 'ExpenseDate', type: 'string' },
    { key: 'description', header: 'Description', type: 'string' },
    ...timestamps,
  ],
});

const equipmentSummary = (record) =>
  (record.equipment ?? []).map((e) => `${e.name} × ${e.quantity}${e.details ? ` (${e.details})` : ''}`).join('; ');

/** Service visits. Equipment = readable summary; EquipmentJSON = the data the app uses. */
export const serviceStore = new GoogleSheetsStore({
  sheetName: tab('SERVICES', 'Services'),
  idPrefix: 'SRV',
  columns: [
    { key: 'id', header: 'ServiceID', type: 'string' },
    { key: 'customerId', header: 'CustomerID', type: 'string' },
    { key: 'equipmentSummary', header: 'Equipment', type: 'string', compute: equipmentSummary },
    { key: 'serviceType', header: 'ServiceType', type: 'string' },
    { key: 'serviceDate', header: 'ServiceDate', type: 'string' },
    { key: 'nextDueDate', header: 'NextDueDate', type: 'string' },
    { key: 'charges', header: 'Charges', type: 'number' },
    { key: 'status', header: 'Status', type: 'string', default: 'scheduled' },
    { key: 'remarks', header: 'Notes', type: 'string' },
    { key: 'customerName', header: 'CustomerName', type: 'string', autoCreate: true },
    { key: 'technician', header: 'Technician', type: 'string', autoCreate: true },
    { key: 'siteAddress', header: 'SiteAddress', type: 'string', autoCreate: true },
    { key: 'certificateNumber', header: 'CertificateNumber', type: 'string', autoCreate: true },
    { key: 'completedAt', header: 'CompletedAt', type: 'string', autoCreate: true },
    { key: 'equipment', header: 'EquipmentJSON', type: 'json', default: [], autoCreate: true },
    { key: 'customer', header: 'CustomerJSON', type: 'json', default: {}, autoCreate: true },
    ...timestamps,
  ],
});

/** Business settings as key/value rows. (Tab created automatically.) */
export const settingsStore = new GoogleSheetsStore({
  sheetName: tab('SETTINGS', 'Settings'),
  idPrefix: 'SET',
  createTab: true,
  columns: [
    { key: 'id', header: 'SettingID', type: 'string' },
    { key: 'key', header: 'Setting', type: 'string' },
    { key: 'value', header: 'Value', type: 'string' },
    ...timestamps,
  ],
});

/** Checks/creates every tab and its columns. Called once at startup. */
export async function initStores() {
  // Sequential: tab creation and header changes are clearer one at a time.
  for (const store of [
    userStore,
    customerStore,
    productStore,
    stockMovementStore,
    quotationStore,
    invoiceStore,
    invoiceItemStore,
    paymentStore,
    expenseStore,
    serviceStore,
    settingsStore,
  ]) {
    await store.init();
  }
}
