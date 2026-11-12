import { useState } from 'react';
import { Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx';
import ExpenseFormModal from '../../components/expenses/ExpenseFormModal.jsx';
import { deleteExpense, listExpenses } from '../../services/expenseService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { monthLabel, monthRange, todayIST } from '../../utils/dates.js';
import { EXPENSE_CATEGORIES } from '../../constants/business.js';

const PAGE_SIZE = 20;
const controlClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100';

/** Category spending for the selected period: one series, bars share one scale. */
function CategoryBreakdown({ byCategory, total, activeCategory, onSelect }) {
  const max = Math.max(...byCategory.map((c) => c.total), 1);
  return (
    <ul className="space-y-3">
      {byCategory.map((c) => {
        const isActive = activeCategory === c.category;
        return (
          <li key={c.category}>
            <button type="button" onClick={() => onSelect(isActive ? '' : c.category)} className={`w-full rounded-md p-1 text-left transition hover:bg-slate-50 ${isActive ? 'bg-flame-50' : ''}`} aria-pressed={isActive}>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-slate-700">{c.category}</span>
                <span className="tabular-nums text-slate-800">
                  {formatMoney(c.total)}
                  <span className="ml-1 text-xs text-slate-400">{total > 0 ? `${Math.round((c.total / total) * 100)}%` : ''}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-slate-100">
                <div className="h-2 rounded-full bg-flame-500" style={{ width: `${(c.total / max) * 100}%` }} />
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export default function ExpensesPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [month, setMonth] = useState(todayIST().slice(0, 7));
  const [page, setPage] = useState(1);
  const [formState, setFormState] = useState(null); // { expense? } | null
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const debouncedSearch = useDebouncedValue(search);
  const { from, to } = monthRange(month);

  const { data, error, isLoading, reload } = useFetch(
    (signal) => listExpenses({ search: debouncedSearch, category, from, to, page, limit: PAGE_SIZE }, signal),
    [debouncedSearch, category, month, page],
  );
  const expenses = data?.items ?? [];
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };
  const periodLabel = month ? monthLabel(month) : 'All time';
  const periodTotal = data?.summary.byCategory.reduce((sum, c) => sum + c.total, 0) ?? 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteExpense(expenseToDelete.id);
      toast.success('Expense deleted.');
      setExpenseToDelete(null);
      if (expenses.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const addButton = (
    <button type="button" className="btn-primary" onClick={() => setFormState({})}>
      <Plus className="h-4 w-4" aria-hidden="true" />
      Add Expense
    </button>
  );

  const renderBody = () => {
    if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
    if (isLoading && !data) return <LoadingState label="Loading expenses..." />;
    if (expenses.length === 0) {
      return <EmptyState icon={Wallet} title="No expenses found" message={`Nothing recorded for ${periodLabel.toLowerCase()}${category ? ` in ${category}` : ''}.`} action={addButton} />;
    }
    return (
      <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-3 sm:px-5">Expense</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 md:table-cell">Category</th>
              <th scope="col" className="px-3 py-3 text-right sm:px-5">Amount</th>
              <th scope="col" className="px-3 py-3 sm:px-5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.map((e) => (
              <tr key={e.id} className="hover:bg-slate-50/70">
                <td className="px-3 py-3 sm:px-5">
                  <p className="font-semibold text-slate-800">{e.title}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(e.date)}
                    <span className="md:hidden"> · {e.category}</span>
                    {e.description && <span className="hidden lg:inline"> · {e.description}</span>}
                  </p>
                </td>
                <td className="hidden px-3 py-3 text-slate-600 sm:px-5 md:table-cell">{e.category}</td>
                <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums text-slate-800 sm:px-5">{formatMoney(e.amount)}</td>
                <td className="px-3 py-3 sm:px-5">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn-icon" onClick={() => setFormState({ expense: e })} aria-label={`Edit ${e.title}`} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-icon hover:bg-fire-50! hover:text-fire-600!" onClick={() => setExpenseToDelete(e)} aria-label={`Delete ${e.title}`} title="Delete">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
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
      <PageHeader title="Expenses" subtitle="Purchases, transport, installation and other costs" actions={addButton} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card min-w-0 xl:col-span-2">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:flex-wrap md:items-center">
            <SearchInput value={search} onChange={withPageReset(setSearch)} placeholder="Search expenses" className="md:max-w-xs md:flex-1" />
            <input type="month" value={month} onChange={(e) => withPageReset(setMonth)(e.target.value)} aria-label="Month" className={controlClass} />
            <button type="button" className="btn-ghost" onClick={() => withPageReset(setMonth)('')} disabled={!month}>All time</button>
            <select value={category} onChange={(e) => withPageReset(setCategory)(e.target.value)} aria-label="Filter by category" className={controlClass}>
              <option value="">All categories</option>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {renderBody()}
          <Pagination pagination={data?.pagination} onPageChange={setPage} itemLabel="expenses" />
        </div>

        <SectionCard title={`Total — ${periodLabel}`} subtitle="Click a category to filter">
          {data ? (
            <>
              <p className="mb-5 text-3xl font-bold tabular-nums text-slate-900">{formatMoney(periodTotal)}</p>
              <CategoryBreakdown byCategory={data.summary.byCategory} total={periodTotal} activeCategory={category} onSelect={withPageReset(setCategory)} />
            </>
          ) : (
            <LoadingState />
          )}
        </SectionCard>
      </div>

      <ExpenseFormModal isOpen={Boolean(formState)} expense={formState?.expense} onClose={() => setFormState(null)} onSaved={() => { setFormState(null); reload(); }} />
      <ConfirmDialog
        isOpen={Boolean(expenseToDelete)}
        title="Delete expense?"
        message={expenseToDelete && <><strong className="text-slate-800">{expenseToDelete.title}</strong> ({formatMoney(expenseToDelete.amount)}) will be permanently removed.</>}
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setExpenseToDelete(null)}
      />
    </div>
  );
}
