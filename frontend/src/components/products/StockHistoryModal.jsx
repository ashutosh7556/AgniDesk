import { Link } from 'react-router';
import Modal from '../ui/Modal.jsx';
import { ErrorState, LoadingState } from '../ui/States.jsx';
import { getStockHistory } from '../../services/productService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';

const TYPE_LABELS = {
  opening: 'Opening stock',
  purchase: 'Stock received',
  adjustment: 'Correction',
  sale: 'Sold',
  'sale-cancelled': 'Sale cancelled',
};

/** Every stock change for one product with a running balance (newest first). */
export default function StockHistoryModal({ product, onClose }) {
  const { data, error, isLoading } = useFetch((signal) => getStockHistory(product.id, signal), [product.id]);
  const entries = data ? [...data].reverse() : [];

  return (
    <Modal isOpen onClose={onClose} title="Stock history" description={`${product.name} · ${product.quantity} available`} size="lg">
      {error && <ErrorState message={error.message} />}
      {isLoading && !data && <LoadingState />}
      {data && (
        <div className="-mx-5 -my-5 overflow-x-auto sm:-mx-6">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-3">Date</th>
                <th scope="col" className="px-4 py-3">Type</th>
                <th scope="col" className="px-4 py-3">Details</th>
                <th scope="col" className="px-4 py-3 text-right">Change</th>
                <th scope="col" className="px-4 py-3 text-right">Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => (
                <tr key={entry.id} className={entry.type === 'sale-cancelled' ? 'text-slate-400' : ''}>
                  <td className="whitespace-nowrap px-4 py-2.5">{formatDate(entry.date)}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-medium">{TYPE_LABELS[entry.type] ?? entry.type}</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {entry.invoiceId ? (
                      <Link to={`/invoices/${entry.invoiceId}`} onClick={onClose} className="text-flame-600 hover:underline">{entry.note}</Link>
                    ) : (
                      entry.note || '—'
                    )}
                  </td>
                  <td className={`whitespace-nowrap px-4 py-2.5 text-right font-semibold tabular-nums ${entry.quantity > 0 ? 'text-emerald-700' : entry.quantity < 0 ? 'text-fire-600' : 'text-slate-400'}`}>
                    {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-800">{entry.balance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}
