import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { FileText, Plus } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx';
import { ValidityBadge } from '../../components/billing/StatusBadges.jsx';
import { listQuotations } from '../../services/quotationService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { formatDate, formatMoney } from '../../utils/format.js';

const PAGE_SIZE = 20;

export default function QuotationsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const { data, error, isLoading, reload } = useFetch(
    (signal) => listQuotations({ search: debouncedSearch, page, limit: PAGE_SIZE }, signal),
    [debouncedSearch, page],
  );
  const quotations = data?.items ?? [];

  const newButton = (
    <Link to="/quotations/new" className="btn-primary">
      <Plus className="h-4 w-4" aria-hidden="true" />
      New Quotation
    </Link>
  );

  const renderBody = () => {
    if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
    if (isLoading && !data) return <LoadingState label="Loading quotations..." />;
    if (quotations.length === 0) {
      return debouncedSearch ? (
        <EmptyState icon={FileText} title="No matching quotations" message={`Nothing found for "${debouncedSearch}".`} />
      ) : (
        <EmptyState icon={FileText} title="No quotations yet" message="Create a quotation, download it as PDF and share it on WhatsApp." action={newButton} />
      );
    }
    return (
      <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-3 sm:px-5">Quotation</th>
              <th scope="col" className="px-3 py-3 sm:px-5">Customer</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 md:table-cell">Valid until</th>
              <th scope="col" className="px-3 py-3 text-right sm:px-5">Amount</th>
              <th scope="col" className="hidden px-3 py-3 sm:table-cell sm:px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotations.map((q) => (
              <tr key={q.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => navigate(`/quotations/${q.id}`)}>
                <td className="px-3 py-3 sm:px-5">
                  <Link to={`/quotations/${q.id}`} className="font-semibold text-slate-800 hover:text-flame-600" onClick={(e) => e.stopPropagation()}>
                    {q.number}
                  </Link>
                  <p className="text-xs text-slate-500">{formatDate(q.date)}</p>
                </td>
                <td className="px-3 py-3 text-slate-700 sm:px-5">{q.customerName}</td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 sm:px-5 md:table-cell">{formatDate(q.validUntil)}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-800 sm:px-5">{formatMoney(q.grandTotal)}</td>
                <td className="hidden px-3 py-3 sm:table-cell sm:px-5"><ValidityBadge isExpired={q.isExpired} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Quotations" subtitle={data ? `${data.pagination.total} quotation${data.pagination.total === 1 ? '' : 's'}` : 'Price quotations for customers'} actions={newButton} />
      <div className="card min-w-0">
        <div className="border-b border-slate-100 p-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by quotation number or customer" className="max-w-md" />
        </div>
        {renderBody()}
        <Pagination pagination={data?.pagination} onPageChange={setPage} itemLabel="quotations" />
      </div>
    </div>
  );
}
