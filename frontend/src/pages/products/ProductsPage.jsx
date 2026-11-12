import { useState } from 'react';
import { AlertTriangle, Boxes, History, IndianRupee, Package, PackagePlus, Pencil, Plus, Trash2 } from 'lucide-react';
import StockAdjustModal from '../../components/products/StockAdjustModal.jsx';
import StockHistoryModal from '../../components/products/StockHistoryModal.jsx';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx';
import ProductFormModal from '../../components/products/ProductFormModal.jsx';
import StockBadge from '../../components/products/StockBadge.jsx';
import { deleteProduct, listProducts } from '../../services/productService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { useToast } from '../../hooks/useToast.js';
import { formatCurrency } from '../../utils/format.js';
import { PRODUCT_CATEGORIES } from '../../constants/business.js';

const PAGE_SIZE = 20;

export default function ProductsPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);

  const [formState, setFormState] = useState(null); // { product? } | null
  const [productToDelete, setProductToDelete] = useState(null);
  const [stockModal, setStockModal] = useState(null); // { mode: 'adjust' | 'history', product } | null
  const [isDeleting, setIsDeleting] = useState(false);

  const { data, error, isLoading, reload } = useFetch(
    (signal) =>
      listProducts({ search: debouncedSearch, category, lowStock: lowStockOnly, page, limit: PAGE_SIZE }, signal),
    [debouncedSearch, category, lowStockOnly, page],
  );

  // Any filter change goes back to page 1.
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const handleSaved = () => {
    setFormState(null);
    reload();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteProduct(productToDelete.id);
      toast.success(`${productToDelete.name} deleted.`);
      setProductToDelete(null);
      if (data.items.length === 1 && page > 1) setPage(page - 1);
      else reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const products = data?.items ?? [];
  const summary = data?.summary;
  const hasFilters = Boolean(debouncedSearch || category || lowStockOnly);

  const renderBody = () => {
    if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
    if (isLoading && !data) return <LoadingState label="Loading products..." />;
    if (products.length === 0) {
      return hasFilters ? (
        <EmptyState icon={Package} title="No matching products" message="Try a different search or clear the filters." />
      ) : (
        <EmptyState
          icon={Package}
          title="No products yet"
          message="Add fire extinguishers, hydrant equipment, safety items and AMC services."
          action={
            <button type="button" className="btn-primary" onClick={() => setFormState({})}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Product
            </button>
          }
        />
      );
    }

    return (
      <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-3 sm:px-5">Product</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 md:table-cell">Category</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 text-right lg:table-cell">Purchase</th>
              <th scope="col" className="px-3 py-3 sm:px-5 text-right">Selling</th>
              <th scope="col" className="px-3 py-3 sm:px-5 text-right">Qty</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 sm:table-cell">Status</th>
              <th scope="col" className="px-3 py-3 sm:px-5 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-slate-50/70">
                <td className="px-3 py-3 sm:px-5">
                  <p className="font-semibold text-slate-800">{product.name}</p>
                  <p className="text-xs text-slate-500">
                    {product.id}
                    <span className="md:hidden"> · {product.category}</span>
                  </p>
                </td>
                <td className="hidden px-3 py-3 sm:px-5 text-slate-600 md:table-cell">{product.category}</td>
                <td className="hidden whitespace-nowrap px-3 py-3 sm:px-5 text-right tabular-nums text-slate-600 lg:table-cell">{formatCurrency(product.purchasePrice)}</td>
                <td className="whitespace-nowrap px-3 py-3 sm:px-5 text-right font-medium tabular-nums text-slate-800">{formatCurrency(product.sellingPrice)}</td>
                <td className={`px-3 py-3 sm:px-5 text-right font-semibold tabular-nums ${product.isLowStock ? 'text-fire-600' : 'text-slate-800'}`}>{product.quantity}</td>
                <td className="hidden px-3 py-3 sm:px-5 sm:table-cell">
                  <StockBadge quantity={product.quantity} threshold={product.lowStockThreshold} />
                </td>
                <td className="px-3 py-3 sm:px-5">
                  <div className="flex justify-end gap-1">
                    <button type="button" className="btn-icon" onClick={() => setStockModal({ mode: 'adjust', product })} aria-label={`Adjust stock of ${product.name}`} title="Adjust stock">
                      <PackagePlus className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-icon" onClick={() => setStockModal({ mode: 'history', product })} aria-label={`Stock history of ${product.name}`} title="Stock history">
                      <History className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-icon" onClick={() => setFormState({ product })} aria-label={`Edit ${product.name}`} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button type="button" className="btn-icon hover:bg-fire-50! hover:text-fire-600!" onClick={() => setProductToDelete(product)} aria-label={`Delete ${product.name}`} title="Delete">
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
      <PageHeader
        title="Products & Inventory"
        subtitle="Manage products, prices and stock levels"
        actions={
          <button type="button" className="btn-primary" onClick={() => setFormState({})}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Product
          </button>
        }
      />

      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total Products" value={summary.totalProducts} icon={Package} tone="navy" />
          <StatCard label="Units in Stock" value={summary.totalUnits} icon={Boxes} tone="gold" />
          <StatCard label="Stock Value" value={formatCurrency(summary.stockValue)} icon={IndianRupee} tone="green" hint="At purchase price" />
          <StatCard label="Low Stock Items" value={summary.lowStockCount} icon={AlertTriangle} tone={summary.lowStockCount ? 'fire' : 'navy'} hint="At or below alert level" />
        </div>
      )}

      {summary?.lowStockCount > 0 && !lowStockOnly && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            {summary.lowStockCount} product{summary.lowStockCount === 1 ? ' is' : 's are'} running low on stock.
          </p>
          <button type="button" className="btn-secondary py-1.5! text-xs" onClick={() => withPageReset(setLowStockOnly)(true)}>
            Show low stock
          </button>
        </div>
      )}

      <div className="card min-w-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
          <SearchInput value={search} onChange={withPageReset(setSearch)} placeholder="Search products" className="md:max-w-xs md:flex-1" />
          <select
            value={category}
            onChange={(event) => withPageReset(setCategory)(event.target.value)}
            aria-label="Filter by category"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100"
          >
            <option value="">All categories</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(event) => withPageReset(setLowStockOnly)(event.target.checked)}
              className="h-4 w-4 rounded border-slate-300 accent-flame-500"
            />
            Low stock only
          </label>
        </div>
        {renderBody()}
        <Pagination pagination={data?.pagination} onPageChange={setPage} itemLabel="products" />
      </div>

      {stockModal?.mode === 'adjust' && (
        <StockAdjustModal
          product={stockModal.product}
          onClose={() => setStockModal(null)}
          onSaved={() => {
            setStockModal(null);
            reload();
          }}
        />
      )}
      {stockModal?.mode === 'history' && <StockHistoryModal product={stockModal.product} onClose={() => setStockModal(null)} />}

      <ProductFormModal
        isOpen={Boolean(formState)}
        product={formState?.product}
        onClose={() => setFormState(null)}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        isOpen={Boolean(productToDelete)}
        title="Delete product?"
        message={
          productToDelete && (
            <>
              <strong className="text-slate-800">{productToDelete.name}</strong> will be permanently removed from inventory. This cannot be undone.
            </>
          )
        }
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}
