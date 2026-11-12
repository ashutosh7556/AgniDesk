import { expenseStore, paymentStore, productStore, serviceStore } from '../storage/stores.js';
import { EXPENSE_CATEGORIES } from '../config/business.js';
import { ApiError } from '../utils/ApiError.js';
import { round2 } from '../utils/billing.js';
import { todayIST } from '../utils/dates.js';
import { findAllInvoicesWithPayments } from './invoice.service.js';
import { getStockLevels } from './inventory.service.js';

/**
 * Business reports. Every report returns the same shape so one table
 * component (frontend) and one Excel exporter can render all of them:
 *
 *   { key, title, period: { from, to } | null, summary: [{ label, value, type }],
 *     columns: [{ key, label, type: 'text' | 'date' | 'number' | 'money' }], rows: [...] }
 *
 * Sales figures use active (non-cancelled) invoices by invoice date.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const monthLabel = (ym) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;
const daysBetween = (a, b) => Math.round((new Date(`${b}T00:00:00Z`) - new Date(`${a}T00:00:00Z`)) / 86_400_000);
const sum = (rows, key) => round2(rows.reduce((total, row) => total + (Number(row[key]) || 0), 0));
const inRange = (date, { from, to }) => date >= from && date <= to;

const activeInvoicesIn = async (period) =>
  (await findAllInvoicesWithPayments()).filter((inv) => inv.status !== 'cancelled' && inRange(inv.date, period));

// ---------------------------------------------------------------------------

async function salesReport(period) {
  const invoices = await activeInvoicesIn(period);
  // Daily rows for ranges up to ~2 months, monthly rows otherwise.
  const byDay = daysBetween(period.from, period.to) <= 62;
  const groups = new Map();
  for (const inv of invoices) {
    const key = byDay ? inv.date : inv.date.slice(0, 7);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(inv);
  }
  const rows = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      period: byDay ? key : monthLabel(key),
      invoices: list.length,
      taxable: sum(list, 'taxableTotal'),
      cgst: sum(list, 'cgstTotal'),
      sgst: sum(list, 'sgstTotal'),
      igst: sum(list, 'igstTotal'),
      total: sum(list, 'grandTotal'),
      received: sum(list, 'amountPaid'),
    }));

  return {
    title: byDay ? 'Daily Sales' : 'Monthly Sales',
    summary: [
      { label: 'Invoices', value: invoices.length, type: 'number' },
      { label: 'Taxable value', value: sum(invoices, 'taxableTotal'), type: 'money' },
      { label: 'GST (CGST + SGST + IGST)', value: sum(invoices, 'taxTotal'), type: 'money' },
      { label: 'Total sales (incl. GST)', value: sum(invoices, 'grandTotal'), type: 'money' },
      { label: 'Received against these invoices', value: sum(invoices, 'amountPaid'), type: 'money' },
    ],
    columns: [
      { key: 'period', label: byDay ? 'Date' : 'Month', type: byDay ? 'date' : 'text' },
      { key: 'invoices', label: 'Invoices', type: 'number' },
      { key: 'taxable', label: 'Taxable', type: 'money' },
      { key: 'cgst', label: 'CGST', type: 'money' },
      { key: 'sgst', label: 'SGST', type: 'money' },
      { key: 'igst', label: 'IGST', type: 'money' },
      { key: 'total', label: 'Total', type: 'money' },
      { key: 'received', label: 'Received', type: 'money' },
    ],
    rows,
  };
}

async function profitLossReport(period) {
  const [invoices, expenses] = await Promise.all([activeInvoicesIn(period), expenseStore.findAll()]);
  const periodExpenses = expenses.filter((e) => inRange(e.date, period));
  const income = sum(invoices, 'taxableTotal');
  const totalExpenses = sum(periodExpenses, 'amount');

  const months = [...new Set([...invoices.map((i) => i.date.slice(0, 7)), ...periodExpenses.map((e) => e.date.slice(0, 7))])].sort();
  const rows = months.map((ym) => {
    const sales = sum(invoices.filter((i) => i.date.startsWith(ym)), 'taxableTotal');
    const monthExpenses = periodExpenses.filter((e) => e.date.startsWith(ym));
    const row = { month: monthLabel(ym), sales };
    for (const category of EXPENSE_CATEGORIES) row[category] = sum(monthExpenses.filter((e) => e.category === category), 'amount');
    row.expenses = sum(monthExpenses, 'amount');
    row.profit = round2(sales - row.expenses);
    return row;
  });

  return {
    title: 'Profit & Loss',
    note: 'Income is sales excluding GST (GST collected is owed to the government). Purchase cost of goods counts only when recorded as a "Product Purchases" expense.',
    summary: [
      { label: 'Income (sales excl. GST)', value: income, type: 'money' },
      { label: 'Total expenses', value: totalExpenses, type: 'money' },
      { label: 'Net profit', value: round2(income - totalExpenses), type: 'money' },
      { label: 'GST collected (not income)', value: sum(invoices, 'taxTotal'), type: 'money' },
      ...EXPENSE_CATEGORIES.map((c) => ({ label: `Expenses · ${c}`, value: sum(periodExpenses.filter((e) => e.category === c), 'amount'), type: 'money' })),
    ],
    columns: [
      { key: 'month', label: 'Month', type: 'text' },
      { key: 'sales', label: 'Income', type: 'money' },
      ...EXPENSE_CATEGORIES.map((c) => ({ key: c, label: c, type: 'money' })),
      { key: 'expenses', label: 'Total expenses', type: 'money' },
      { key: 'profit', label: 'Profit', type: 'money' },
    ],
    rows,
  };
}

async function pendingPaymentsReport(period) {
  const today = todayIST();
  const invoices = (await findAllInvoicesWithPayments())
    .filter((inv) => inv.status !== 'cancelled' && inv.balanceDue > 0 && inv.date <= period.to)
    .sort((a, b) => a.date.localeCompare(b.date));
  const rows = invoices.map((inv) => ({
    number: inv.number,
    date: inv.date,
    customer: inv.customerName,
    mobile: inv.customer?.mobile ?? '',
    total: inv.grandTotal,
    paid: inv.amountPaid,
    balance: inv.balanceDue,
    ageDays: daysBetween(inv.date, today),
  }));
  const bucket = (min, max) => sum(rows.filter((r) => r.ageDays >= min && r.ageDays <= max), 'balance');

  return {
    title: 'Pending Payments',
    note: `All unpaid or partly paid invoices dated on or before ${period.to}.`,
    summary: [
      { label: 'Invoices with balance', value: rows.length, type: 'number' },
      { label: 'Total pending', value: sum(rows, 'balance'), type: 'money' },
      { label: '0–30 days', value: bucket(0, 30), type: 'money' },
      { label: '31–60 days', value: bucket(31, 60), type: 'money' },
      { label: '61–90 days', value: bucket(61, 90), type: 'money' },
      { label: 'Over 90 days', value: bucket(91, Infinity), type: 'money' },
    ],
    columns: [
      { key: 'number', label: 'Invoice', type: 'text' },
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'customer', label: 'Customer', type: 'text' },
      { key: 'mobile', label: 'Mobile', type: 'text' },
      { key: 'total', label: 'Total', type: 'money' },
      { key: 'paid', label: 'Paid', type: 'money' },
      { key: 'balance', label: 'Balance', type: 'money' },
      { key: 'ageDays', label: 'Age (days)', type: 'number' },
    ],
    rows,
    periodMode: 'asOf',
  };
}

async function productSalesReport(period) {
  const [invoices, products] = await Promise.all([activeInvoicesIn(period), productStore.findAll()]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const groups = new Map();
  for (const inv of invoices) {
    for (const line of inv.items ?? []) {
      const key = line.productId || `custom:${line.description.trim().toLowerCase()}`;
      const product = productById.get(line.productId);
      if (!groups.has(key)) {
        groups.set(key, {
          product: product?.name ?? line.description,
          category: product?.category ?? 'Custom item / service',
          quantity: 0,
          invoices: new Set(),
          taxable: 0,
          total: 0,
        });
      }
      const g = groups.get(key);
      g.quantity = Math.round((g.quantity + line.quantity) * 1000) / 1000;
      g.invoices.add(inv.id);
      g.taxable = round2(g.taxable + line.taxableValue);
      g.total = round2(g.total + line.total);
    }
  }
  const rows = [...groups.values()]
    .map((g) => ({ ...g, invoices: g.invoices.size }))
    .sort((a, b) => b.total - a.total);

  return {
    title: 'Product Sales',
    summary: [
      { label: 'Products / items sold', value: rows.length, type: 'number' },
      { label: 'Units sold', value: Math.round(rows.reduce((s, r) => s + r.quantity, 0) * 1000) / 1000, type: 'number' },
      { label: 'Taxable value', value: sum(rows, 'taxable'), type: 'money' },
      { label: 'Total (incl. GST)', value: sum(rows, 'total'), type: 'money' },
    ],
    columns: [
      { key: 'product', label: 'Product / item', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'quantity', label: 'Qty sold', type: 'number' },
      { key: 'invoices', label: 'Invoices', type: 'number' },
      { key: 'taxable', label: 'Taxable', type: 'money' },
      { key: 'total', label: 'Total', type: 'money' },
    ],
    rows,
  };
}

async function inventoryReport() {
  const [products, levels] = await Promise.all([productStore.findAll(), getStockLevels()]);
  const rows = products
    .map((p) => {
      const level = levels.get(p.id) ?? { opening: p.openingStock, adjusted: 0, sold: 0, available: p.openingStock };
      const status = level.available <= 0 ? 'Out of stock' : level.available <= p.lowStockThreshold ? 'Low stock' : 'In stock';
      return {
        product: p.name,
        category: p.category,
        opening: level.opening,
        adjusted: level.adjusted,
        sold: level.sold,
        available: level.available,
        alertAt: p.lowStockThreshold,
        purchasePrice: p.purchasePrice,
        sellingPrice: p.sellingPrice,
        stockValue: round2(Math.max(level.available, 0) * p.purchasePrice),
        status,
      };
    })
    .sort((a, b) => a.product.localeCompare(b.product));

  return {
    title: 'Inventory',
    note: 'Current stock (not date-filtered). Stock value is at purchase price.',
    summary: [
      { label: 'Products', value: rows.length, type: 'number' },
      { label: 'Units in stock', value: Math.round(rows.reduce((s, r) => s + Math.max(r.available, 0), 0) * 1000) / 1000, type: 'number' },
      { label: 'Stock value', value: sum(rows, 'stockValue'), type: 'money' },
      { label: 'Low / out of stock', value: rows.filter((r) => r.status !== 'In stock').length, type: 'number' },
    ],
    columns: [
      { key: 'product', label: 'Product', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'opening', label: 'Opening', type: 'number' },
      { key: 'adjusted', label: 'Adjusted', type: 'number' },
      { key: 'sold', label: 'Sold', type: 'number' },
      { key: 'available', label: 'Available', type: 'number' },
      { key: 'alertAt', label: 'Alert at', type: 'number' },
      { key: 'purchasePrice', label: 'Purchase price', type: 'money' },
      { key: 'sellingPrice', label: 'Selling price', type: 'money' },
      { key: 'stockValue', label: 'Stock value', type: 'money' },
      { key: 'status', label: 'Status', type: 'text' },
    ],
    rows,
    periodMode: 'none',
  };
}

async function servicesReport(period) {
  const services = (await serviceStore.findAll())
    .filter((s) => inRange(s.serviceDate, period))
    .sort((a, b) => a.serviceDate.localeCompare(b.serviceDate));
  const rows = services.map((s) => ({
    date: s.serviceDate,
    customer: s.customerName,
    serviceType: s.serviceType,
    status: s.status[0].toUpperCase() + s.status.slice(1),
    technician: s.technician,
    charges: s.charges,
    certificate: s.certificateNumber,
    nextDue: s.nextDueDate,
  }));
  const count = (status) => services.filter((s) => s.status === status).length;
  return {
    title: 'Services',
    summary: [
      { label: 'Service records', value: services.length, type: 'number' },
      { label: 'Completed', value: count('completed'), type: 'number' },
      { label: 'Scheduled', value: count('scheduled'), type: 'number' },
      { label: 'Cancelled', value: count('cancelled'), type: 'number' },
      { label: 'Charges (completed)', value: sum(services.filter((s) => s.status === 'completed'), 'charges'), type: 'money' },
    ],
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'customer', label: 'Customer', type: 'text' },
      { key: 'serviceType', label: 'Service type', type: 'text' },
      { key: 'status', label: 'Status', type: 'text' },
      { key: 'technician', label: 'Technician', type: 'text' },
      { key: 'charges', label: 'Charges', type: 'money' },
      { key: 'certificate', label: 'Certificate', type: 'text' },
      { key: 'nextDue', label: 'Next due', type: 'date' },
    ],
    rows,
  };
}

async function expensesReport(period) {
  const expenses = (await expenseStore.findAll())
    .filter((e) => inRange(e.date, period))
    .sort((a, b) => a.date.localeCompare(b.date));
  return {
    title: 'Expenses',
    summary: [
      { label: 'Total expenses', value: sum(expenses, 'amount'), type: 'money' },
      ...EXPENSE_CATEGORIES.map((c) => ({ label: c, value: sum(expenses.filter((e) => e.category === c), 'amount'), type: 'money' })),
    ],
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'title', label: 'Expense', type: 'text' },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'money' },
      { key: 'description', label: 'Description', type: 'text' },
    ],
    rows: expenses.map(({ date, title, category, amount, description }) => ({ date, title, category, amount, description })),
  };
}

async function paymentsReport(period) {
  const payments = (await paymentStore.findAll())
    .filter((p) => inRange(p.date, period))
    .sort((a, b) => a.date.localeCompare(b.date));
  const modes = [...new Set(payments.map((p) => p.mode))];
  return {
    title: 'Payments Received',
    summary: [
      { label: 'Total received', value: sum(payments, 'amount'), type: 'money' },
      { label: 'Payments', value: payments.length, type: 'number' },
      ...modes.map((m) => ({ label: m, value: sum(payments.filter((p) => p.mode === m), 'amount'), type: 'money' })),
    ],
    columns: [
      { key: 'date', label: 'Date', type: 'date' },
      { key: 'invoiceNumber', label: 'Invoice', type: 'text' },
      { key: 'customerName', label: 'Customer', type: 'text' },
      { key: 'mode', label: 'Mode', type: 'text' },
      { key: 'reference', label: 'Reference', type: 'text' },
      { key: 'amount', label: 'Amount', type: 'money' },
    ],
    rows: payments.map(({ date, invoiceNumber, customerName, mode, reference, amount }) => ({ date, invoiceNumber, customerName, mode, reference, amount })),
  };
}

export const REPORTS = {
  sales: salesReport,
  'profit-loss': profitLossReport,
  'pending-payments': pendingPaymentsReport,
  payments: paymentsReport,
  'product-sales': productSalesReport,
  inventory: inventoryReport,
  services: servicesReport,
  expenses: expensesReport,
};

export async function buildReport(key, { from, to }) {
  const build = REPORTS[key];
  if (!build) throw new ApiError(404, 'Unknown report.');
  if (from > to) {
    throw new ApiError(400, 'Please correct the highlighted fields.', [{ field: 'from', message: '"From" date must be before "To" date.' }]);
  }
  const period = { from, to };
  const report = await build(period);
  return { key, period: report.periodMode === 'none' ? null : period, note: '', ...report };
}
