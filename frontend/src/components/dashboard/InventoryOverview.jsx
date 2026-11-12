import { AlertTriangle, CheckCircle2 } from 'lucide-react';

/** Product stock table with low-stock flag (quantity <= reorderLevel). */
export default function InventoryOverview({ products }) {
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
          {products.map((product) => {
            const isLow = product.quantity <= product.reorderLevel;
            return (
              <tr key={product.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3 font-medium text-slate-800">{product.name}</td>
                <td className="px-5 py-3 text-slate-500">{product.category}</td>
                <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-800">{product.quantity}</td>
                <td className="px-5 py-3">
                  {isLow ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-fire-50 px-2 py-0.5 text-[11px] font-semibold text-fire-700 ring-1 ring-inset ring-fire-200">
                      <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                      Low stock
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-200">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      In stock
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
