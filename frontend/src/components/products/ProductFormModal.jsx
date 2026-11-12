import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { SelectField, TextField } from '../ui/FormControls.jsx';
import { createProduct, updateProduct } from '../../services/productService.js';
import { validateProduct } from '../../utils/validation.js';
import { formatCurrency } from '../../utils/format.js';
import { DEFAULT_GST_RATE, GST_RATES, PRODUCT_CATEGORIES } from '../../constants/business.js';
import { useToast } from '../../hooks/useToast.js';

const EMPTY_FORM = {
  name: '',
  category: '',
  purchasePrice: '',
  sellingPrice: '',
  openingStock: '0',
  lowStockThreshold: '5',
  hsnCode: '',
  gstRate: String(DEFAULT_GST_RATE),
};

// Numbers are edited as strings so users can clear a field while typing.
const toForm = (product) =>
  product ? Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, String(product[key] ?? '')])) : EMPTY_FORM;

const toPayload = (form, isEdit) => ({
  name: form.name.trim(),
  category: form.category,
  purchasePrice: Number(form.purchasePrice),
  sellingPrice: Number(form.sellingPrice),
  // Opening stock is set once on create; later changes go through Adjust stock.
  ...(isEdit ? {} : { openingStock: Number(form.openingStock) }),
  lowStockThreshold: Number(form.lowStockThreshold),
  hsnCode: form.hsnCode.trim(),
  gstRate: Number(form.gstRate),
});

/** Add / edit product. Pass `product` to edit, omit it to create. */
export default function ProductFormModal({ isOpen, product, onClose, onSaved }) {
  const isEdit = Boolean(product);
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(toForm(product));
      setErrors({});
    }
  }, [isOpen, product]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateProduct(form, { isEdit });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      const payload = toPayload(form, isEdit);
      const saved = isEdit ? await updateProduct(product.id, payload) : await createProduct(payload);
      toast.success(isEdit ? 'Product updated.' : 'Product added.');
      onSaved(saved);
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const purchase = Number(form.purchasePrice);
  const selling = Number(form.sellingPrice);
  const showMargin = form.purchasePrice !== '' && form.sellingPrice !== '' && Number.isFinite(purchase) && Number.isFinite(selling);
  const margin = selling - purchase;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      title={isEdit ? 'Edit Product' : 'Add Product'}
      description={isEdit ? product.id : 'Fields marked * are required.'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="product-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </>
      }
    >
      <form id="product-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Product name" name="name" value={form.name} onChange={handleChange} error={errors.name} required maxLength={150} className="sm:col-span-2" autoComplete="off" />
        <SelectField
          label="Category"
          name="category"
          value={form.category}
          onChange={handleChange}
          error={errors.category}
          required
          options={PRODUCT_CATEGORIES}
          placeholder="Select category"
          className="sm:col-span-2"
        />
        <TextField
          label="HSN/SAC code"
          name="hsnCode"
          inputMode="numeric"
          maxLength={8}
          value={form.hsnCode}
          onChange={handleChange}
          error={errors.hsnCode}
          hint="Optional. Printed on GST invoices."
        />
        <div>
          <label htmlFor="field-gstRate" className="mb-1.5 block text-sm font-medium text-slate-700">GST rate</label>
          <select
            id="field-gstRate"
            name="gstRate"
            value={form.gstRate}
            onChange={handleChange}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100"
          >
            {GST_RATES.map((rate) => (
              <option key={rate} value={rate}>{rate}%</option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-slate-500">Default rate when added to an invoice.</p>
        </div>
        <TextField label="Purchase price" name="purchasePrice" type="number" inputMode="decimal" min="0" step="0.01" prefix="₹" value={form.purchasePrice} onChange={handleChange} error={errors.purchasePrice} required />
        <TextField label="Selling price" name="sellingPrice" type="number" inputMode="decimal" min="0" step="0.01" prefix="₹" value={form.sellingPrice} onChange={handleChange} error={errors.sellingPrice} required />
        {showMargin && (
          <p className={`-mt-1 text-xs sm:col-span-2 ${margin < 0 ? 'font-medium text-fire-600' : 'text-slate-500'}`}>
            Margin per unit: {formatCurrency(margin)}
            {margin < 0 && ' (selling below purchase price)'}
          </p>
        )}
        {isEdit ? (
          <div>
            <p className="mb-1.5 block text-sm font-medium text-slate-700">Available stock</p>
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-800">{product.quantity}</p>
            <p className="mt-1.5 text-xs text-slate-500">Use “Adjust stock” on the products list to change it.</p>
          </div>
        ) : (
          <TextField label="Opening stock" name="openingStock" type="number" inputMode="numeric" min="0" step="1" value={form.openingStock} onChange={handleChange} error={errors.openingStock} hint="Quantity you have today." required />
        )}
        <TextField
          label="Low stock alert at"
          name="lowStockThreshold"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          value={form.lowStockThreshold}
          onChange={handleChange}
          error={errors.lowStockThreshold}
          hint="Alert when quantity falls to this level."
          required
        />
      </form>
    </Modal>
  );
}
