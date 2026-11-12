import { Link } from 'react-router';
import { FileText, Plus, Receipt } from 'lucide-react';
import SectionCard from '../ui/SectionCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../ui/States.jsx';
import { PaymentStatusBadge, ValidityBadge } from '../billing/StatusBadges.jsx';
import { listInvoices } from '../../services/invoiceService.js';
import { listQuotations } from '../../services/quotationService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate, formatMoney } from '../../utils/format.js';

const RECENT_LIMIT = 10;

function DocumentRow({ to, number, date, amount, badge }) {
  return (
    <li>
      <Link to={to} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{number}</p>
          <p className="text-xs text-slate-500">{formatDate(date)}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-sm font-medium tabular-nums text-slate-800">{formatMoney(amount)}</span>
          {badge}
        </div>
      </Link>
    </li>
  );
}

/** Invoices, quotations and billing totals for one customer. */
export default function CustomerPurchaseHistory({ customerId }) {
  const { data, error, isLoading, reload } = useFetch(
    async (signal) => {
      const [invoices, quotations] = await Promise.all([
        listInvoices({ customerId, limit: RECENT_LIMIT }, signal),
        listQuotations({ customerId, limit: RECENT_LIMIT }, signal),
      ]);
      return { invoices, quotations };
    },
    [customerId],
  );

  const actions = (
    <div className="flex gap-2">
      <Link to={`/quotations/new?customerId=${customerId}`} className="btn-secondary px-3! py-1.5! text-xs">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Quotation
      </Link>
      <Link to={`/invoices/new?customerId=${customerId}`} className="btn-primary px-3! py-1.5! text-xs">
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        Invoice
      </Link>
    </div>
  );

  if (error) return <SectionCard title="Purchase History" className="lg:col-span-2"><ErrorState message={error.message} onRetry={reload} /></SectionCard>;
  if (isLoading && !data) return <SectionCard title="Purchase History" className="lg:col-span-2"><LoadingState /></SectionCard>;

  const { invoices, quotations } = data;
  const hasNothing = invoices.pagination.total === 0 && quotations.pagination.total === 0;

  return (
    <div className="space-y-6 lg:col-span-2">
      <SectionCard title="Purchase History" subtitle="Billing summary for this customer" action={actions}>
        {hasNothing ? (
          <EmptyState icon={Receipt} title="No quotations or invoices yet" message="Create a quotation or invoice for this customer." />
        ) : (
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Total billed</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-slate-900">{formatMoney(invoices.summary.totalInvoiced)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Received</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-emerald-700">{formatMoney(invoices.summary.totalReceived)}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Pending</dt>
              <dd className={`mt-1 text-xl font-bold tabular-nums ${invoices.summary.totalPending > 0 ? 'text-fire-600' : 'text-slate-900'}`}>
                {formatMoney(invoices.summary.totalPending)}
              </dd>
            </div>
          </dl>
        )}
      </SectionCard>

      {!hasNothing && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="card min-w-0">
            <h3 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-base font-semibold text-slate-900">
              <Receipt className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Invoices <span className="text-sm font-normal text-slate-500">({invoices.pagination.total})</span>
            </h3>
            {invoices.items.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {invoices.items.map((inv) => (
                  <DocumentRow key={inv.id} to={`/invoices/${inv.id}`} number={inv.number} date={inv.date} amount={inv.grandTotal} badge={<PaymentStatusBadge status={inv.paymentStatus} />} />
                ))}
              </ul>
            )}
          </section>
          <section className="card min-w-0">
            <h3 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 text-base font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-slate-400" aria-hidden="true" />
              Quotations <span className="text-sm font-normal text-slate-500">({quotations.pagination.total})</span>
            </h3>
            {quotations.items.length === 0 ? (
              <p className="px-5 py-6 text-sm text-slate-500">No quotations yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {quotations.items.map((q) => (
                  <DocumentRow key={q.id} to={`/quotations/${q.id}`} number={q.number} date={q.date} amount={q.grandTotal} badge={<ValidityBadge isExpired={q.isExpired} />} />
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
