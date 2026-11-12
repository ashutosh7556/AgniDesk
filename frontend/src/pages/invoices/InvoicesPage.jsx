import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { AlertCircle, CheckCircle2, IndianRupee, Plus, Receipt } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx';
import { InvoiceTypeBadge, PaymentStatusBadge } from '../../components/billing/StatusBadges.jsx';
import { listInvoices } from '../../services/invoiceService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { formatCurrency, formatDate, formatMoney } from '../../utils/format.js';

const PAGE_SIZE = 20;
const selectClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100';

export default function InvoicesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [invoiceType, setInvoiceType] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, error, isLoading, reload } = useFetch(
    (signal) => listInvoices({ search: debouncedSearch, invoiceType, paymentStatus, page, limit: PAGE_SIZE }, signal),
    [debouncedSearch, invoiceType, paymentStatus, page],
  );
  const invoices = data?.items ?? [];
  const hasFilters = Boolean(debouncedSearch || invoiceType || paymentStatus);
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const newButton = (
    <Link to="/invoices/new" className="btn-primary">
      <Plus className="h-4 w-4" aria-hidden="true" />
      New Invoice
    </Link>
  );

  const renderBody = () => {
    if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
    if (isLoading && !data) return <LoadingState label="Loading invoices..." />;
    if (invoices.length === 0) {
      return hasFilters ? (
        <EmptyState icon={Receipt} title="No matching invoices" message="Try a different search or clear the filters." />
      ) : (
        <EmptyState icon={Receipt} title="No invoices yet" message="Create GST or Non-GST invoices with automatic numbering." action={newButton} />
      );
    }
    return (
      <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-3 sm:px-5">Invoice</th>
              <th scope="col" className="px-3 py-3 sm:px-5">Customer</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 lg:table-cell">Type</th>
              <th scope="col" className="px-3 py-3 text-right sm:px-5">Amount</th>
              <th scope="col" className="hidden px-3 py-3 text-right sm:px-5 md:table-cell">Balance</th>
              <th scope="col" className="hidden px-3 py-3 sm:table-cell sm:px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className={`cursor-pointer hover:bg-slate-50/70 ${inv.status === 'cancelled' ? 'text-slate-400' : ''}`} onClick={() => navigate(`/invoices/${inv.id}`)}>
                <td className="px-3 py-3 sm:px-5">
                  <Link to={`/invoices/${inv.id}`} className={`font-semibold hover:text-flame-600 ${inv.status === 'cancelled' ? 'text-slate-400 line-through' : 'text-slate-800'}`} onClick={(e) => e.stopPropagation()}>
                    {inv.number}
                  </Link>
                  <p className="text-xs text-slate-500">{formatDate(inv.date)}</p>
                </td>
                <td className="px-3 py-3 sm:px-5">{inv.customerName}</td>
                <td className="hidden px-3 py-3 sm:px-5 lg:table-cell"><InvoiceTypeBadge type={inv.invoiceType} /></td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums sm:px-5">{formatMoney(inv.grandTotal)}</td>
                <td className={`hidden whitespace-nowrap px-3 py-3 text-right tabular-nums sm:px-5 md:table-cell ${inv.balanceDue > 0 ? 'font-medium text-fire-600' : ''}`}>{formatMoney(inv.balanceDue)}</td>
                <td className="hidden px-3 py-3 sm:table-cell sm:px-5"><PaymentStatusBadge status={inv.paymentStatus} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" subtitle="GST and Non-GST invoices" actions={newButton} />

      {data?.summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <StatCard label={hasFilters ? 'Invoiced (filtered)' : 'Total Invoiced'} value={formatCurrency(data.summary.totalInvoiced)} icon={IndianRupee} tone="navy" hint="Excludes cancelled" />
          <StatCard label="Received" value={formatCurrency(data.summary.totalReceived)} icon={CheckCircle2} tone="green" />
          <StatCard label="Pending" value={formatCurrency(data.summary.totalPending)} icon={AlertCircle} tone="fire" />
        </div>
      )}

      <div className="card min-w-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
          <SearchInput value={search} onChange={withPageReset(setSearch)} placeholder="Search by invoice number or customer" className="md:max-w-xs md:flex-1" />
          <select value={invoiceType} onChange={(e) => withPageReset(setInvoiceType)(e.target.value)} aria-label="Filter by invoice type" className={selectClass}>
            <option value="">All types</option>
            <option value="gst">GST</option>
            <option value="non-gst">Non-GST</option>
          </select>
          <select value={paymentStatus} onChange={(e) => withPageReset(setPaymentStatus)(e.target.value)} aria-label="Filter by payment status" className={selectClass}>
            <option value="">All statuses</option>
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partly paid</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        {renderBody()}
        <Pagination pagination={data?.pagination} onPageChange={setPage} itemLabel="invoices" />
      </div>
    </div>
  );
}
