import { invoiceStore, paymentStore } from '../storage/stores.js';
import { NUMBER_PREFIX } from '../config/business.js';
import { ApiError } from '../utils/ApiError.js';
import { matchesSearch, paginate } from '../utils/listing.js';
import { round2 } from '../utils/billing.js';
import {
  assertSameFinancialYear,
  buildBillingDocument,
  byDocumentDateDesc,
  nextDocumentNumber,
  toListItem,
} from './billingDocument.service.js';
import { paidTotals, recordPayment } from './payment.service.js';

const SEARCH_FIELDS = ['number', 'customerName'];

const taxModeFor = (invoiceType) => (invoiceType === 'gst' ? 'gst' : 'none');
const prefixFor = (invoiceType) => (invoiceType === 'gst' ? NUMBER_PREFIX.gstInvoice : NUMBER_PREFIX.nonGstInvoice);

export function paymentStatusOf(invoice) {
  if (invoice.status === 'cancelled') return 'cancelled';
  if (invoice.amountPaid >= invoice.grandTotal) return 'paid';
  if (invoice.amountPaid > 0) return 'partial';
  return 'unpaid';
}

/** Adds amountPaid (sum of payment records), balanceDue and paymentStatus. */
export const withPaymentInfo = (invoice, amountPaid = 0) => {
  const enriched = { ...invoice, amountPaid };
  return {
    ...enriched,
    paymentStatus: paymentStatusOf(enriched),
    balanceDue: invoice.status === 'cancelled' ? 0 : round2(Math.max(invoice.grandTotal - amountPaid, 0)),
  };
};

/** All invoices with payment info — also used by the dashboard and reports. */
export async function findAllInvoicesWithPayments() {
  const [invoices, payments] = await Promise.all([invoiceStore.findAll(), paymentStore.findAll()]);
  const paid = paidTotals(payments);
  return invoices.map((inv) => withPaymentInfo(inv, paid.get(inv.id) ?? 0));
}

export async function listInvoices({ search, customerId, invoiceType, paymentStatus, page, limit }) {
  const invoices = await findAllInvoicesWithPayments();

  const filtered = invoices
    .filter((inv) => !customerId || inv.customerId === customerId)
    .filter((inv) => !invoiceType || inv.invoiceType === invoiceType)
    .filter((inv) => !paymentStatus || inv.paymentStatus === paymentStatus)
    .filter((inv) => matchesSearch(inv, SEARCH_FIELDS, search))
    .sort(byDocumentDateDesc)
    .map(toListItem);

  // Totals for the current filter set (cancelled invoices excluded).
  const active = filtered.filter((inv) => inv.status !== 'cancelled');
  const summary = {
    totalInvoiced: round2(active.reduce((sum, inv) => sum + inv.grandTotal, 0)),
    totalReceived: round2(active.reduce((sum, inv) => sum + inv.amountPaid, 0)),
    totalPending: round2(active.reduce((sum, inv) => sum + inv.balanceDue, 0)),
  };

  return { ...paginate(filtered, { page, limit }), summary };
}

export async function getInvoice(id) {
  const [invoice, payments] = await Promise.all([invoiceStore.findById(id), paymentStore.findAll()]);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  return withPaymentInfo(invoice, paidTotals(payments).get(id) ?? 0);
}

export async function createInvoice({ payment, ...input }) {
  const document = await buildBillingDocument(input, taxModeFor(input.invoiceType));
  if (payment && payment.amount > document.grandTotal) {
    throw new ApiError(400, 'Please correct the highlighted fields.', [
      { field: 'payment.amount', message: 'Amount received cannot be more than the invoice total.' },
    ]);
  }

  const created = await invoiceStore.create((rows) => ({
    ...document,
    invoiceType: input.invoiceType,
    status: 'active',
    // Separate number series per invoice type, restarting each financial year.
    number: nextDocumentNumber(
      rows.filter((r) => r.invoiceType === input.invoiceType),
      prefixFor(input.invoiceType),
      input.date,
    ),
  }));

  if (payment) {
    // Second file write: if it fails, the invoice still exists and the payment can be re-entered.
    try {
      await recordPayment(created.id, { ...payment, date: input.date, note: 'Received at billing' });
    } catch (error) {
      throw new ApiError(
        500,
        `Invoice ${created.number} was created, but the payment could not be saved. Please record it from the invoice page. (${error.message})`,
      );
    }
  }
  return getInvoice(created.id);
}

export async function updateInvoice(id, { payment: _ignored, ...input }) {
  const existing = await getInvoice(id);
  if (existing.status === 'cancelled') throw new ApiError(409, 'Cancelled invoices cannot be edited.');
  if (existing.invoiceType !== input.invoiceType) {
    throw new ApiError(400, 'Please correct the highlighted fields.', [
      { field: 'invoiceType', message: 'Invoice type cannot be changed after the invoice is created.' },
    ]);
  }
  assertSameFinancialYear(existing.date, input.date);

  const document = await buildBillingDocument(input, taxModeFor(input.invoiceType));
  if (document.grandTotal < existing.amountPaid) {
    throw new ApiError(
      400,
      `The new total (${document.grandTotal}) is less than the amount already received (${existing.amountPaid}). Delete a payment first.`,
    );
  }

  await invoiceStore.update(id, document);
  return getInvoice(id);
}

/**
 * Invoices are never deleted: GST rules require a continuous number series,
 * so an invoice issued by mistake is cancelled and keeps its number.
 * Cancelling restores stock automatically (stock is derived from active invoices).
 */
export async function cancelInvoice(id) {
  const existing = await getInvoice(id);
  if (existing.status === 'cancelled') throw new ApiError(409, 'Invoice is already cancelled.');
  if (existing.amountPaid > 0) {
    throw new ApiError(409, 'This invoice has payments recorded. Delete the payments (refund) before cancelling it.');
  }
  await invoiceStore.update(id, { status: 'cancelled' });
  return getInvoice(id);
}
