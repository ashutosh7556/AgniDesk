import { formatMoney } from '../../utils/format.js';

/** Totals block used by the document form (live preview) and detail pages. */
export default function TotalsSummary({ totals, taxMode, supplyType, amountPaid, balanceDue }) {
  const isGst = taxMode === 'gst';
  const rows = [['Subtotal', formatMoney(totals.subtotal)]];
  if (totals.discountTotal > 0) rows.push(['Discount', `− ${formatMoney(totals.discountTotal)}`]);
  if (isGst) {
    rows.push(['Taxable value', formatMoney(totals.taxableTotal)]);
    if (supplyType === 'inter') rows.push(['IGST', formatMoney(totals.igstTotal)]);
    else rows.push(['CGST', formatMoney(totals.cgstTotal)], ['SGST', formatMoney(totals.sgstTotal)]);
  }
  if (totals.roundOff !== 0) rows.push(['Round off', `${totals.roundOff > 0 ? '+' : '−'} ${formatMoney(Math.abs(totals.roundOff))}`]);

  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-slate-500">{label}</dt>
          <dd className="tabular-nums text-slate-800">{value}</dd>
        </div>
      ))}
      <div className="mt-3! flex justify-between gap-4 rounded-lg bg-navy-900 px-3 py-2.5 text-white">
        <dt className="font-semibold">Grand total</dt>
        <dd className="text-base font-bold tabular-nums">{formatMoney(totals.grandTotal)}</dd>
      </div>
      {amountPaid !== undefined && (
        <>
          <div className="flex justify-between gap-4 pt-1">
            <dt className="text-slate-500">Amount paid</dt>
            <dd className="tabular-nums text-slate-800">{formatMoney(amountPaid)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className={`font-semibold ${balanceDue > 0 ? 'text-fire-600' : 'text-slate-800'}`}>Balance due</dt>
            <dd className={`font-semibold tabular-nums ${balanceDue > 0 ? 'text-fire-600' : 'text-slate-800'}`}>{formatMoney(balanceDue)}</dd>
          </div>
        </>
      )}
    </dl>
  );
}
