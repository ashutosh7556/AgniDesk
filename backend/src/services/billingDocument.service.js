import { customerStore } from '../storage/stores.js';
import { getBusinessProfile } from './settings.service.js';
import { ApiError } from '../utils/ApiError.js';
import { calculateDocument, detectSupplyType } from '../utils/billing.js';
import { financialYear } from '../utils/dates.js';

/**
 * Shared logic for quotations and invoices:
 * resolves the customer, freezes a snapshot of their billing details,
 * decides intra/inter-state supply and computes all totals server-side
 * (client-sent totals are never trusted).
 */
export async function buildBillingDocument(input, taxMode) {
  const customer = await customerStore.findById(input.customerId);
  if (!customer) {
    throw new ApiError(400, 'Please correct the highlighted fields.', [
      { field: 'customerId', message: 'The selected customer no longer exists.' },
    ]);
  }

  const supplyType = input.supplyType ?? detectSupplyType(customer.gstNumber, getBusinessProfile().stateCode);
  const { items, totals } = calculateDocument({ items: input.items, taxMode, supplyType });

  return {
    date: input.date,
    customerId: customer.id,
    customerName: customer.name,
    customer: {
      id: customer.id,
      name: customer.name,
      companyName: customer.companyName,
      mobile: customer.mobile,
      email: customer.email,
      address: customer.address,
      gstNumber: customer.gstNumber,
    },
    taxMode,
    supplyType,
    items,
    ...totals,
    notes: input.notes,
  };
}

/**
 * Next sequential number in the document's financial year, e.g. "INV/2026-27/0007".
 * Must be called inside ExcelStore.create(fn) so it runs under the file lock.
 */
export function nextDocumentNumber(rows, prefix, isoDate) {
  const fy = financialYear(isoDate);
  const pattern = new RegExp(`^${prefix}/${fy}/(\\d+)$`);
  const max = rows.reduce((highest, row) => {
    const match = pattern.exec(row.number);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);
  return `${prefix}/${fy}/${String(max + 1).padStart(4, '0')}`;
}

/** Newest document first: by date, then by creation time. */
export const byDocumentDateDesc = (a, b) =>
  b.date.localeCompare(a.date) || (b.createdAt ?? '').localeCompare(a.createdAt ?? '');

/** List rows omit heavy fields (line items, customer snapshot). */
export const toListItem = ({ items, customer, terms, ...rest }) => ({ ...rest, itemCount: items?.length ?? 0 });

/** Rejects edits that would move a document into another financial year (its number encodes the FY). */
export function assertSameFinancialYear(existingDate, newDate) {
  if (financialYear(existingDate) !== financialYear(newDate)) {
    throw new ApiError(400, 'Please correct the highlighted fields.', [
      { field: 'date', message: `Date must stay within financial year ${financialYear(existingDate)}.` },
    ]);
  }
}
