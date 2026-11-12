import { useState } from 'react';
import { Link } from 'react-router';
import { CreditCard, Hash, IndianRupee, Trash2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx';
import { deletePayment, listPayments } from '../../services/paymentService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../hooks/useToast.js';
import { formatCurrency, formatDate, formatMoney } from '../../utils/format.js';
import { monthLabel, monthRange, todayIST } from '../../utils/dates.js';
import { PAYMENT_MODES } from '../../constants/business.js';

const PAGE_SIZE = 20;
const controlClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100';

/** All payments received across invoices. Payments are recorded from the invoice page. */
export default function PaymentsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');
  const [month, setMonth] = useState(todayIST().slice(0, 7)); // '' = all time
  const [page, setPage] = useState(1);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const { from, to } = monthRange(month);

  const { data, error, isLoading, reload } = useFetch(
    (signal) => listPayments({ search: debouncedSearch, mode, from, to, page, limit: PAGE_SIZE }, signal),
    [debouncedSearch, mode, month, page],
  );
  const payments = data?.items ?? [];
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePayment(paymentToDelete.id);
      toast.success('Payment deleted.');
      setPaymentToDelete(null);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const renderBody = () => {
    if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
    if (isLoading && !data) return <LoadingState label="Loading payments..." />;
    if (payments.length === 0) {
      return <EmptyState icon={CreditCard} title="No payments found" message="Payments are recorded from an invoice page or when creating an invoice." />;
    }
    return (
      <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-3 sm:px-5">Date</th>
              <th scope="col" className="px-3 py-3 sm:px-5">Invoice / Customer</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 md:table-cell">Mode</th>
              <th scope="col" className="px-3 py-3 text-right sm:px-5">Amount</th>
              <th scope="col" className="px-3 py-3 sm:px-5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70">
                <td className="whitespace-nowrap px-3 py-3 text-slate-600 sm:px-5">{formatDate(p.date)}</td>
                <td className="px-3 py-3 sm:px-5">
                  <Link to={`/invoices/${p.invoiceId}`} className="font-semibold text-slate-800 hover:text-flame-600">{p.invoiceNumber}</Link>
                  <p className="text-xs text-slate-500">{p.customerName}</p>
                </td>
                <td className="hidden px-3 py-3 text-slate-600 sm:px-5 md:table-cell">
                  {p.mode}
                  {p.reference && <span className="block text-xs text-slate-400">{p.reference}</span>}
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-emerald-700 sm:px-5">{formatMoney(p.amount)}</td>
                <td className="px-3 py-3 text-right sm:px-5">
                  <button type="button" className="btn-icon hover:bg-fire-50! hover:text-fire-600!" onClick={() => setPaymentToDelete(p)} aria-label={`Delete payment ${p.id}`} title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Payments" subtitle="Money received against invoices" />

      {data?.summary && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <StatCard label={month ? `Received in ${monthLabel(month)}` : 'Received (all time)'} value={formatCurrency(data.summary.totalReceived)} icon={IndianRupee} tone="green" hint={mode ? `${mode} only` : undefined} />
          <StatCard label="Number of payments" value={data.summary.count} icon={Hash} tone="navy" />
        </div>
      )}

      <div className="card min-w-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
          <SearchInput value={search} onChange={withPageReset(setSearch)} placeholder="Search invoice, customer or reference" className="md:max-w-xs md:flex-1" />
          <input type="month" value={month} onChange={(e) => withPageReset(setMonth)(e.target.value)} aria-label="Month" className={controlClass} />
          <button type="button" className="btn-ghost" onClick={() => withPageReset(setMonth)('')} disabled={!month}>All time</button>
          <select value={mode} onChange={(e) => withPageReset(setMode)(e.target.value)} aria-label="Filter by mode" className={controlClass}>
            <option value="">All modes</option>
            {PAYMENT_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {renderBody()}
        <Pagination pagination={data?.pagination} onPageChange={setPage} itemLabel="payments" />
      </div>

      <ConfirmDialog
        isOpen={Boolean(paymentToDelete)}
        title="Delete payment?"
        message={paymentToDelete && <>The payment of <strong className="text-slate-800">{formatMoney(paymentToDelete.amount)}</strong> for {paymentToDelete.invoiceNumber} will be removed and its balance due will increase.</>}
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPaymentToDelete(null)}
      />
    </div>
  );
}
