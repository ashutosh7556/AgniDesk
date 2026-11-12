/**
 * Live-preview copy of backend/src/utils/billing.js.
 * The backend recalculates everything on save and is the source of truth;
 * keep the two files identical in logic.
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
    return { ...item, gstRate, gross, discountAmount, taxableValue, taxAmount, total: round2(taxableValue + taxAmount) };
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

export const detectSupplyType = (customerGstin, sellerStateCode) =>
  customerGstin && customerGstin.slice(0, 2) !== sellerStateCode ? 'inter' : 'intra';
