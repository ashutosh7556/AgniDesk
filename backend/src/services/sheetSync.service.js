import { invoiceItemStore, invoiceStore, productStore } from '../storage/stores.js';
import { getStockLevels } from './inventory.service.js';
import { findAllInvoicesWithPayments } from './invoice.service.js';

/**
 * Keeps the spreadsheet's DISPLAY columns in step with the real data:
 *   - Products.Stock            = calculated available stock
 *   - Invoices.PaidAmount       = sum of payments
 *   - Invoices.PaymentStatus    = Paid / Partly paid / Unpaid / Cancelled
 *   - InvoiceItems tab          = one row per invoice line (rebuilt)
 *
 * The app never reads these back (the source of truth is opening stock +
 * movements + invoices, and the Payments tab), so they can't drift the logic.
 * Syncs are debounced (~1 s) and batched to stay within Google's write quota;
 * failures are logged and retried on the next change.
 */

const DEBOUNCE_MS = 1000;
const STATUS_LABELS = { paid: 'Paid', partial: 'Partly paid', unpaid: 'Unpaid', cancelled: 'Cancelled' };

const tasks = {
  async stock() {
    const levels = await getStockLevels();
    const changes = new Map([...levels].map(([id, level]) => [id, { sheetStock: level.available }]));
    return productStore.updateMany(changes);
  },
  async invoicePayments() {
    const invoices = await findAllInvoicesWithPayments();
    const changes = new Map(
      invoices.map((inv) => [inv.id, { sheetPaidAmount: inv.amountPaid, sheetPaymentStatus: STATUS_LABELS[inv.paymentStatus] ?? '' }]),
    );
    return invoiceStore.updateMany(changes);
  },
  async invoiceItems() {
    const invoices = await invoiceStore.findAll();
    const rows = invoices
      .sort((a, b) => a.id.localeCompare(b.id))
      .flatMap((inv) =>
        (inv.items ?? []).map((item, index) => ({
          id: `${inv.id}-${String(index + 1).padStart(2, '0')}`,
          invoiceId: inv.id,
          invoiceNumber: inv.status === 'cancelled' ? `${inv.number} (cancelled)` : inv.number,
          productId: item.productId,
          description: item.description,
          hsnCode: item.hsnCode,
          quantity: item.quantity,
          rate: item.rate,
          discountPercent: item.discountPercent,
          gstRate: item.gstRate,
          taxableValue: item.taxableValue,
          taxAmount: item.taxAmount,
          total: item.total,
        })),
      );
    await invoiceItemStore.replaceAll(rows);
    return rows.length;
  },
};

const pending = new Set();
let timer = null;
let running = Promise.resolve();

async function runTasks(names) {
  for (const name of names) {
    try {
      await tasks[name]();
    } catch (error) {
      console.warn(`[sheet-sync] ${name} failed (will retry on next change): ${error.message}`);
    }
  }
}

/** Schedule display-column syncs: 'stock' | 'invoicePayments' | 'invoiceItems'. */
export function scheduleSheetSync(...names) {
  names.forEach((n) => pending.add(n));
  clearTimeout(timer);
  timer = setTimeout(() => {
    const batch = [...pending];
    pending.clear();
    running = running.then(() => runTasks(batch));
  }, DEBOUNCE_MS);
  timer.unref?.();
}

/** Runs every sync now (startup, after a restore) and waits for it. */
export async function syncAllSheetsNow() {
  await running;
  await runTasks(Object.keys(tasks));
}
