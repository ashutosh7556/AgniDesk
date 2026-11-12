import { invoiceStore, paymentStore } from '../storage/stores.js';
import { ApiError } from '../utils/ApiError.js';
import { round2 } from '../utils/billing.js';
import { matchesSearch, paginate } from '../utils/listing.js';
import { scheduleSheetSync } from './sheetSync.service.js';

/**
 * Payments are the single source of truth for "amount paid":
 * an invoice's paid amount is always the sum of its payment records.
 */

const SEARCH_FIELDS = ['invoiceNumber', 'customerName', 'reference'];

const byPaymentDateDesc = (a, b) => b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

/** Map invoiceId -> total paid. */
export function paidTotals(payments) {
  const totals = new Map();
  for (const p of payments) totals.set(p.invoiceId, round2((totals.get(p.invoiceId) ?? 0) + p.amount));
  return totals;
}

export async function listPayments({ search, mode, from, to, page, limit }) {
  const payments = await paymentStore.findAll();
  const filtered = payments
    .filter((p) => !mode || p.mode === mode)
    .filter((p) => !from || p.date >= from)
    .filter((p) => !to || p.date <= to)
    .filter((p) => matchesSearch(p, SEARCH_FIELDS, search))
    .sort(byPaymentDateDesc);

  const summary = {
    totalReceived: round2(filtered.reduce((sum, p) => sum + p.amount, 0)),
    count: filtered.length,
  };
  return { ...paginate(filtered, { page, limit }), summary };
}

export async function listInvoicePayments(invoiceId) {
  const payments = await paymentStore.findAll();
  return payments.filter((p) => p.invoiceId === invoiceId).sort(byPaymentDateDesc);
}

/**
 * Records a payment against an invoice. The balance check runs inside the
 * payments file lock, so two simultaneous payments can't overpay an invoice.
 */
export async function recordPayment(invoiceId, { date, amount, mode, reference = '', note = '' }) {
  const invoice = await invoiceStore.findById(invoiceId);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  if (invoice.status === 'cancelled') throw new ApiError(409, 'Payments cannot be recorded on a cancelled invoice.');

  const created = await paymentStore.create((existingPayments) => {
    const alreadyPaid = paidTotals(existingPayments).get(invoiceId) ?? 0;
    const balance = round2(invoice.grandTotal - alreadyPaid);
    if (amount > balance) {
      throw new ApiError(400, 'Please correct the highlighted fields.', [
        { field: 'amount', message: balance > 0 ? `Amount cannot be more than the balance due (${balance}).` : 'This invoice is already fully paid.' },
      ]);
    }
    return {
      date,
      invoiceId,
      invoiceNumber: invoice.number,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      amount,
      mode,
      reference,
      note,
    };
  });
  scheduleSheetSync('invoicePayments');
  return created;
}

export async function deletePayment(id) {
  const deleted = await paymentStore.delete(id);
  if (!deleted) throw new ApiError(404, 'Payment not found.');
  scheduleSheetSync('invoicePayments');
}
