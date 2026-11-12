import { quotationStore } from '../storage/stores.js';
import { NUMBER_PREFIX } from '../config/business.js';
import { ApiError } from '../utils/ApiError.js';
import { matchesSearch, paginate } from '../utils/listing.js';
import { todayIST } from '../utils/dates.js';
import {
  assertSameFinancialYear,
  buildBillingDocument,
  byDocumentDateDesc,
  nextDocumentNumber,
  toListItem,
} from './billingDocument.service.js';

const SEARCH_FIELDS = ['number', 'customerName'];

/** A quotation is "expired" once its validity date has passed. */
const withStatus = (quotation) => ({
  ...quotation,
  isExpired: quotation.validUntil < todayIST(),
});

export async function listQuotations({ search, customerId, page, limit }) {
  const quotations = await quotationStore.findAll();
  const filtered = quotations
    .filter((q) => !customerId || q.customerId === customerId)
    .filter((q) => matchesSearch(q, SEARCH_FIELDS, search))
    .sort(byDocumentDateDesc)
    .map((q) => withStatus(toListItem(q)));
  return paginate(filtered, { page, limit });
}

export async function getQuotation(id) {
  const quotation = await quotationStore.findById(id);
  if (!quotation) throw new ApiError(404, 'Quotation not found.');
  return withStatus(quotation);
}

export async function createQuotation(input) {
  const document = await buildBillingDocument(input, input.taxMode);
  const created = await quotationStore.create((rows) => ({
    ...document,
    validUntil: input.validUntil,
    terms: input.terms,
    number: nextDocumentNumber(rows, NUMBER_PREFIX.quotation, input.date),
  }));
  return withStatus(created);
}

export async function updateQuotation(id, input) {
  const existing = await getQuotation(id);
  assertSameFinancialYear(existing.date, input.date);
  const document = await buildBillingDocument(input, input.taxMode);
  const updated = await quotationStore.update(id, { ...document, validUntil: input.validUntil, terms: input.terms });
  if (!updated) throw new ApiError(404, 'Quotation not found.');
  return withStatus(updated);
}

export async function deleteQuotation(id) {
  const deleted = await quotationStore.delete(id);
  if (!deleted) throw new ApiError(404, 'Quotation not found.');
}
