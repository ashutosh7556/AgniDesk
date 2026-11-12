import { customerStore, expenseStore, paymentStore, productStore, quotationStore } from '../storage/stores.js';
import { round2 } from '../utils/billing.js';
import { todayIST } from '../utils/dates.js';
import { findAllInvoicesWithPayments } from './invoice.service.js';
import { getStockLevels } from './inventory.service.js';

/**
 * Dashboard figures. "Sales" = invoice grand totals (incl. GST) of active invoices.
 * Estimated profit = taxable value (sales excl. GST) − expenses, for the current month.
 * It does not subtract the purchase cost of goods sold (that is tracked via
 * "Product Purchases" expenses instead).
 */

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const shiftDate = (iso, { days = 0, months = 0 }) => {
  const d = new Date(`${iso}T00:00:00Z`);
  if (months) d.setUTCMonth(d.getUTCMonth() + months, 1);
  if (days) d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const sum = (rows, key) => round2(rows.reduce((total, row) => total + row[key], 0));
const pctChange = (current, previous) => (previous > 0 ? round2(((current - previous) / previous) * 100) : null);
const inRange = (date, from, to) => date >= from && date <= to;

export async function getDashboard() {
  const today = todayIST();
  const monthStart = `${today.slice(0, 7)}-01`;
  const yesterday = shiftDate(today, { days: -1 });
  const lastMonthStart = shiftDate(monthStart, { months: -1 });
  // Same number of days into last month, for a fair month-to-date comparison.
  const lastMonthSameDay = shiftDate(lastMonthStart, { days: Number(today.slice(8, 10)) - 1 });

  const [invoices, customers, expenses, payments, quotations, products, levels] = await Promise.all([
    findAllInvoicesWithPayments(),
    customerStore.findAll(),
    expenseStore.findAll(),
    paymentStore.findAll(),
    quotationStore.findAll(),
    productStore.findAll(),
    getStockLevels(),
  ]);

  const active = invoices.filter((inv) => inv.status !== 'cancelled');
  const thisMonth = active.filter((inv) => inRange(inv.date, monthStart, today));
  const lastMonthToDate = active.filter((inv) => inRange(inv.date, lastMonthStart, lastMonthSameDay));
  const todaySales = sum(active.filter((inv) => inv.date === today), 'grandTotal');
  const yesterdaySales = sum(active.filter((inv) => inv.date === yesterday), 'grandTotal');
  const monthSales = sum(thisMonth, 'grandTotal');
  const monthExpenses = sum(expenses.filter((e) => inRange(e.date, monthStart, today)), 'amount');
  const withBalance = active.filter((inv) => inv.balanceDue > 0);

  const stock = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    quantity: levels.get(p.id)?.available ?? p.openingStock,
    lowStockThreshold: p.lowStockThreshold,
  }));
  const lowStock = stock.filter((p) => p.quantity <= p.lowStockThreshold);

  // Last 6 months of sales, oldest first
  const salesOverview = Array.from({ length: 6 }, (_, i) => {
    const start = shiftDate(monthStart, { months: i - 5 });
    const end = shiftDate(shiftDate(start, { months: 1 }), { days: -1 });
    return {
      month: MONTH_LABELS[Number(start.slice(5, 7)) - 1],
      sales: sum(active.filter((inv) => inRange(inv.date, start, end)), 'grandTotal'),
    };
  });

  const recentActivity = [
    ...invoices.map((inv) => ({
      id: inv.id,
      type: 'invoice',
      title: `Invoice ${inv.number}${inv.status === 'cancelled' ? ' (cancelled)' : ''}`,
      detail: `${inv.customerName} · ${inv.grandTotal}`,
      link: `/invoices/${inv.id}`,
      at: inv.createdAt,
    })),
    ...payments.map((p) => ({
      id: p.id,
      type: 'payment',
      title: 'Payment received',
      detail: `${p.customerName} · ${p.amount} · ${p.mode}`,
      link: `/invoices/${p.invoiceId}`,
      at: p.createdAt,
    })),
    ...quotations.map((q) => ({
      id: q.id,
      type: 'quotation',
      title: `Quotation ${q.number}`,
      detail: `${q.customerName} · ${q.grandTotal}`,
      link: `/quotations/${q.id}`,
      at: q.createdAt,
    })),
    ...expenses.map((e) => ({
      id: e.id,
      type: 'expense',
      title: 'Expense recorded',
      detail: `${e.title} · ${e.amount}`,
      link: '/expenses',
      at: e.createdAt,
    })),
    ...customers.map((c) => ({
      id: c.id,
      type: 'customer',
      title: 'New customer added',
      detail: c.companyName ? `${c.name} · ${c.companyName}` : c.name,
      link: `/customers/${c.id}`,
      at: c.createdAt,
    })),
  ]
    .sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))
    .slice(0, 8);

  return {
    summary: {
      todaySales,
      todaySalesChange: pctChange(todaySales, yesterdaySales),
      monthlySales: monthSales,
      monthlySalesChange: pctChange(monthSales, sum(lastMonthToDate, 'grandTotal')),
      totalExpenses: monthExpenses,
      estimatedProfit: round2(sum(thisMonth, 'taxableTotal') - monthExpenses),
      pendingPayments: sum(withBalance, 'balanceDue'),
      pendingInvoices: withBalance.length,
      totalCustomers: customers.length,
      newCustomersThisMonth: customers.filter((c) => (c.createdAt ?? '').slice(0, 10) >= monthStart).length,
      totalInvoices: active.length,
      invoicesThisMonth: thisMonth.length,
      availableStock: round2(stock.reduce((total, p) => total + Math.max(p.quantity, 0), 0)),
      lowStockItems: lowStock.length,
    },
    salesOverview,
    // Low-stock items first, then the rest by quantity
    inventory: [...stock].sort((a, b) => Number(b.quantity <= b.lowStockThreshold) - Number(a.quantity <= a.lowStockThreshold) || a.quantity - b.quantity).slice(0, 6),
    recentActivity,
  };
}
