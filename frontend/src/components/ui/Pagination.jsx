import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange, itemLabel = 'records' }) {
  if (!pagination || pagination.total === 0) return null;
  const { page, limit, total, totalPages } = pagination;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <p>
        Showing <span className="font-medium text-slate-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-slate-700">{total}</span> {itemLabel}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button type="button" className="btn-icon" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-2 text-xs">
            Page {page} of {totalPages}
          </span>
          <button type="button" className="btn-icon" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
