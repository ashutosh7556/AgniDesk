/**
 * Quotation / invoice calculations. This is the source of truth; the
 * frontend has an identical copy (frontend/src/utils/billing.js) only for
 * live previews. Keep both in sync.
 *
 * Per line:
 *   gross         = quantity × rate
 *   discount      = gross × discount% (discount is applied BEFORE tax)
 *   taxableValue  = gross − discount
 *   tax           = taxableValue × GST%  (0 for non-GST documents)
 * Document:
 *   intra-state -> tax split equally into CGST + SGST
 *   inter-state -> all tax is IGST
 *   grand total is rounded to the nearest rupee; difference shown as "round off".
 */

export const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateDocument({ items, taxMode, supplyType }) {
  const applyGst = taxMode === 'gst';

  const lines = items.map((item) => {
    const gross = round2(item.quantity * item.rate);
    const discountAmount = round2((gross * (item.discountPercent || 0)) / 100);
    const taxableValue = round2(gross - discountAmount);
    const gstRate = applyGst ? item.gstRate : 0;
    const taxAmount = round2((taxableValue * gstRate) / 100);
    return {
      ...item,
      gstRate,
      gross,
      discountAmount,
      taxableValue,
      taxAmount,
      total: round2(taxableValue + taxAmount),
    };
  });

  const sum = (key) => round2(lines.reduce((total, line) => total + line[key], 0));
  const subtotal = sum('gross');
  const discountTotal = sum('discountAmount');
  const taxableTotal = sum('taxableValue');
  const taxTotal = sum('taxAmount');

  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  if (applyGst) {
    if (supplyType === 'inter') {
      igstTotal = taxTotal;
    } else {
      cgstTotal = round2(taxTotal / 2);
      sgstTotal = round2(taxTotal - cgstTotal);
    }
  }

  const exactTotal = round2(taxableTotal + taxTotal);
  const grandTotal = Math.round(exactTotal);
  const roundOff = round2(grandTotal - exactTotal);

  return {
    items: lines,
    totals: { subtotal, discountTotal, taxableTotal, cgstTotal, sgstTotal, igstTotal, taxTotal, roundOff, grandTotal },
  };
}

/** Intra-state unless the customer's GSTIN belongs to a different state. */
export const detectSupplyType = (customerGstin, sellerStateCode) =>
  customerGstin && customerGstin.slice(0, 2) !== sellerStateCode ? 'inter' : 'intra';
