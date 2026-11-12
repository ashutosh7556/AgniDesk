import { invoiceStore } from '../storage/stores.js';
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

const SEARCH_FIELDS = ['number', 'customerName'];

const taxModeFor = (invoiceType) => (invoiceType === 'gst' ? 'gst' : 'none');
const prefixFor = (invoiceType) => (invoiceType === 'gst' ? NUMBER_PREFIX.gstInvoice : NUMBER_PREFIX.nonGstInvoice);

export function paymentStatusOf(invoice) {
  if (invoice.status === 'cancelled') return 'cancelled';
  if (invoice.amountPaid >= invoice.grandTotal) return 'paid';
  if (invoice.amountPaid > 0) return 'partial';
  return 'unpaid';
}

const withPaymentInfo = (invoice) => ({
  ...invoice,
  paymentStatus: paymentStatusOf(invoice),
  balanceDue: invoice.status === 'cancelled' ? 0 : round2(Math.max(invoice.grandTotal - invoice.amountPaid, 0)),
});

const assertPaidWithinTotal = (amountPaid, grandTotal) => {
  if (amountPaid > grandTotal) {
    throw new ApiError(400, 'Please correct the highlighted fields.', [
      { field: 'amountPaid', message: 'Amount paid cannot be more than the invoice total.' },
    ]);
  }
};

export async function listInvoices({ search, customerId, invoiceType, paymentStatus, page, limit }) {
  const invoices = (await invoiceStore.findAll()).map(withPaymentInfo);

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
  const invoice = await invoiceStore.findById(id);
  if (!invoice) throw new ApiError(404, 'Invoice not found.');
  return withPaymentInfo(invoice);
}

export async function createInvoice(input) {
  const document = await buildBillingDocument(input, taxModeFor(input.invoiceType));
  assertPaidWithinTotal(input.amountPaid, document.grandTotal);

  const created = await invoiceStore.create((rows) => ({
    ...document,
    invoiceType: input.invoiceType,
    status: 'active',
    amountPaid: input.amountPaid,
    // Separate number series per invoice type, restarting each financial year.
    number: nextDocumentNumber(
      rows.filter((r) => r.invoiceType === input.invoiceType),
      prefixFor(input.invoiceType),
      input.date,
    ),
  }));
  return withPaymentInfo(created);
}

export async function updateInvoice(id, input) {
  const existing = await getInvoice(id);
  if (existing.status === 'cancelled') throw new ApiError(409, 'Cancelled invoices cannot be edited.');
  if (existing.invoiceType !== input.invoiceType) {
    throw new ApiError(400, 'Please correct the highlighted fields.', [
      { field: 'invoiceType', message: 'Invoice type cannot be changed after the invoice is created.' },
    ]);
  }
  assertSameFinancialYear(existing.date, input.date);

  const document = await buildBillingDocument(input, taxModeFor(input.invoiceType));
  assertPaidWithinTotal(input.amountPaid, document.grandTotal);

  const updated = await invoiceStore.update(id, { ...document, amountPaid: input.amountPaid });
  if (!updated) throw new ApiError(404, 'Invoice not found.');
  return withPaymentInfo(updated);
}

/** Updates only the amount received; the rest of the invoice stays untouched. */
export async function updatePayment(id, { amountPaid }) {
  const existing = await getInvoice(id);
  if (existing.status === 'cancelled') throw new ApiError(409, 'Cancelled invoices cannot be updated.');
  assertPaidWithinTotal(amountPaid, existing.grandTotal);
  const updated = await invoiceStore.update(id, { amountPaid });
  return withPaymentInfo(updated);
}

/**
 * Invoices are never deleted: GST rules require a continuous number series,
 * so an invoice issued by mistake is cancelled and keeps its number.
 */
export async function cancelInvoice(id) {
  const existing = await getInvoice(id);
  if (existing.status === 'cancelled') throw new ApiError(409, 'Invoice is already cancelled.');
  const updated = await invoiceStore.update(id, { status: 'cancelled' });
  return withPaymentInfo(updated);
}
