import StockBadge from '../products/StockBadge.jsx';

/** Product stock table (low-stock items first). products: [{ id, name, category, quantity, lowStockThreshold }] */
export default function InventoryOverview({ products }) {
  if (!products.length) return <p className="py-6 text-center text-sm text-slate-500">No products yet.</p>;
  return (
    <div className="-mx-5 -my-5 overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th scope="col" className="px-5 py-3">Product</th>
            <th scope="col" className="px-5 py-3">Category</th>
            <th scope="col" className="px-5 py-3 text-right">Qty</th>
            <th scope="col" className="px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {products.map((product) => (
            <tr key={product.id} className="hover:bg-slate-50/60">
              <td className="px-5 py-3 font-medium text-slate-800">{product.name}</td>
              <td className="px-5 py-3 text-slate-500">{product.category}</td>
              <td className={`px-5 py-3 text-right font-semibold tabular-nums ${product.quantity <= product.lowStockThreshold ? 'text-fire-600' : 'text-slate-800'}`}>{product.quantity}</td>
              <td className="px-5 py-3">
                <StockBadge quantity={product.quantity} threshold={product.lowStockThreshold} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
