import { Link } from 'react-router';
import SectionCard from '../ui/SectionCard.jsx';
import TotalsSummary from './TotalsSummary.jsx';
import { formatDate, formatMoney } from '../../utils/format.js';

/** Read-only view of a quotation or invoice (customer, items, totals, terms). */
export default function DocumentView({ document, kind, sidebarExtra }) {
  const isGst = document.taxMode === 'gst';
  const customer = document.customer ?? {};
  const isInvoice = kind === 'invoice';

  const meta = [
    ['Date', formatDate(document.date)],
    ...(isInvoice ? [] : [['Valid until', formatDate(document.validUntil)]]),
    ['Tax', isGst ? (document.supplyType === 'inter' ? 'GST — IGST (inter-state)' : 'GST — CGST + SGST') : 'No GST'],
  ];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="min-w-0 space-y-6 xl:col-span-2">
        <SectionCard title="Billed To">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="text-sm">
              <Link to={`/customers/${customer.id}`} className="font-semibold text-slate-900 hover:text-flame-600">{customer.name}</Link>
              {customer.companyName && <p className="text-slate-700">{customer.companyName}</p>}
              {customer.address && <p className="mt-1 whitespace-pre-line text-slate-500">{customer.address}</p>}
              {customer.mobile && <p className="mt-1 text-slate-500">+91 {customer.mobile}</p>}
              {customer.gstNumber && <p className="mt-1 font-mono text-xs text-slate-700">GSTIN {customer.gstNumber}</p>}
            </div>
            <dl className="space-y-1.5 text-sm">
              {meta.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="text-right font-medium text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </SectionCard>

        <SectionCard title="Items & Services" subtitle={`${document.items.length} item${document.items.length === 1 ? '' : 's'}`}>
          {/* Phones: one card per line item (no sideways scrolling) */}
          <ul className="-mx-5 -my-5 divide-y divide-slate-100 sm:hidden">
            {document.items.map((item, index) => (
              <li key={index} className="px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm font-medium text-slate-800">
                    <span className="mr-1 text-slate-400">{index + 1}.</span>
                    {item.description}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">{formatMoney(item.total)}</p>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {item.quantity} × {formatMoney(item.rate)}
                  {item.discountPercent ? ` · ${item.discountPercent}% off` : ''}
                  {isGst ? ` · GST ${item.gstRate}%` : ''}
                  {item.hsnCode ? ` · HSN ${item.hsnCode}` : ''}
                </p>
              </li>
            ))}
          </ul>
          <div className="-mx-5 -my-5 hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3">#</th>
                  <th scope="col" className="px-4 py-3">Item</th>
                  <th scope="col" className="px-4 py-3 text-right">Qty</th>
                  <th scope="col" className="px-4 py-3 text-right">Rate</th>
                  <th scope="col" className="px-4 py-3 text-right">Disc</th>
                  {isGst && <th scope="col" className="px-4 py-3 text-right">GST</th>}
                  <th scope="col" className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {document.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{item.description}</p>
                      {item.hsnCode && <p className="text-xs text-slate-500">HSN/SAC {item.hsnCode}</p>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{item.quantity}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatMoney(item.rate)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-500">{item.discountPercent ? `${item.discountPercent}%` : '—'}</td>
                    {isGst && <td className="px-4 py-3 text-right tabular-nums text-slate-500">{item.gstRate}%</td>}
                    <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums text-slate-800">{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>

        {(document.terms || document.notes) && (
          <SectionCard title={document.terms ? 'Terms & Notes' : 'Notes'}>
            {document.terms && (
              <>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terms & conditions</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{document.terms}</p>
              </>
            )}
            {document.notes && (
              <>
                <h3 className={`text-xs font-semibold uppercase tracking-wide text-slate-500 ${document.terms ? 'mt-4' : ''}`}>Notes</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{document.notes}</p>
              </>
            )}
          </SectionCard>
        )}
      </div>

      <div className="space-y-4 xl:col-span-1">
        <SectionCard title="Summary">
          <TotalsSummary
            totals={document}
            taxMode={document.taxMode}
            supplyType={document.supplyType}
            {...(isInvoice && document.status !== 'cancelled' ? { amountPaid: document.amountPaid, balanceDue: document.balanceDue } : {})}
          />
        </SectionCard>
        {sidebarExtra}
      </div>
    </div>
  );
}
