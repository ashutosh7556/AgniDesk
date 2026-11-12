import { Plus, Trash2 } from 'lucide-react';
import SearchSelect from '../ui/SearchSelect.jsx';
import { fetchProductOptions } from './pickerOptions.js';
import { DEFAULT_GST_RATE, GST_RATES } from '../../constants/business.js';
import { formatMoney } from '../../utils/format.js';

let keyCounter = 0;
const newKey = () => `line-${Date.now()}-${keyCounter++}`;

/** Editable line item. Numbers are kept as strings while editing. */
export const createLineItem = (overrides = {}) => ({
  key: newKey(),
  productId: '',
  description: '',
  hsnCode: '',
  quantity: '1',
  rate: '',
  discountPercent: '0',
  gstRate: String(DEFAULT_GST_RATE),
  ...overrides,
});

/** Existing document line -> editable line. */
export const toEditableLine = (line) =>
  createLineItem({
    productId: line.productId ?? '',
    description: line.description,
    hsnCode: line.hsnCode ?? '',
    quantity: String(line.quantity),
    rate: String(line.rate),
    discountPercent: String(line.discountPercent ?? 0),
    gstRate: String(line.gstRate ?? DEFAULT_GST_RATE),
  });

const inputClass = (hasError) =>
  `block w-full rounded-md border bg-white px-2.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
    hasError ? 'border-fire-500 focus:ring-fire-100' : 'border-slate-300 focus:border-flame-500 focus:ring-flame-100'
  }`;

function Field({ id, label, error, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-slate-500">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-fire-600">{error}</p>}
    </div>
  );
}

/**
 * Each line is a small card: full-width description, then the numeric fields.
 * This stays readable at any width (the form column is narrow on laptops).
 *
 * items: editable lines; computed: lines from calculateDocument (same order).
 * errors: keyed like "items.0.quantity"; onClearError(key) clears one as the user edits.
 */
export default function LineItemsEditor({ items, computed, onChange, showGst, errors = {}, onClearError }) {
  const update = (index, field, value) => {
    onChange(items.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
    const errorKey = `items.${index}.${field}`;
    if (errors[errorKey]) onClearError?.(errorKey);
  };
  const remove = (key) => onChange(items.filter((item) => item.key !== key));

  const addProduct = (option) => {
    const product = option.data;
    onChange([
      ...items.filter((item) => item.description.trim() || item.rate), // drop an untouched blank line
      createLineItem({
        productId: product.id,
        description: product.name,
        hsnCode: product.hsnCode ?? '',
        rate: String(product.sellingPrice),
        gstRate: String(product.gstRate ?? DEFAULT_GST_RATE),
      }),
    ]);
  };

  const numbersGrid = showGst ? 'sm:grid-cols-[90px_80px_110px_80px_90px_1fr]' : 'sm:grid-cols-[90px_80px_110px_80px_1fr]';

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const err = (field) => errors[`items.${index}.${field}`];
        const id = (field) => `${item.key}-${field}`;
        const line = computed[index];
        return (
          <div key={item.key} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <div className="flex items-start gap-2">
              <span className="mt-8 w-5 shrink-0 text-center text-xs font-semibold text-slate-400">{index + 1}</span>
              <div className="min-w-0 flex-1 space-y-3">
                <Field id={id('description')} label="Item / Service" error={err('description')}>
                  <input
                    id={id('description')}
                    value={item.description}
                    onChange={(e) => update(index, 'description', e.target.value)}
                    placeholder="e.g. ABC Powder Extinguisher 6kg or Annual maintenance visit"
                    maxLength={300}
                    aria-invalid={Boolean(err('description'))}
                    className={inputClass(err('description'))}
                  />
                </Field>

                <div className={`grid grid-cols-2 gap-2 ${numbersGrid}`}>
                  <Field id={id('hsn')} label="HSN/SAC" error={err('hsnCode')}>
                    <input id={id('hsn')} value={item.hsnCode} onChange={(e) => update(index, 'hsnCode', e.target.value)} inputMode="numeric" maxLength={8} placeholder="—" className={inputClass(err('hsnCode'))} />
                  </Field>
                  <Field id={id('qty')} label="Qty" error={err('quantity')}>
                    <input id={id('qty')} type="number" min="0" step="any" inputMode="decimal" value={item.quantity} onChange={(e) => update(index, 'quantity', e.target.value)} className={`${inputClass(err('quantity'))} text-right`} />
                  </Field>
                  <Field id={id('rate')} label="Rate (₹)" error={err('rate')}>
                    <input id={id('rate')} type="number" min="0" step="0.01" inputMode="decimal" value={item.rate} onChange={(e) => update(index, 'rate', e.target.value)} placeholder="0.00" className={`${inputClass(err('rate'))} text-right`} />
                  </Field>
                  <Field id={id('disc')} label="Disc %" error={err('discountPercent')}>
                    <input id={id('disc')} type="number" min="0" max="100" step="any" inputMode="decimal" value={item.discountPercent} onChange={(e) => update(index, 'discountPercent', e.target.value)} className={`${inputClass(err('discountPercent'))} text-right`} />
                  </Field>
                  {showGst && (
                    <Field id={id('gst')} label="GST %" error={err('gstRate')}>
                      <select id={id('gst')} value={item.gstRate} onChange={(e) => update(index, 'gstRate', e.target.value)} className={inputClass(err('gstRate'))}>
                        {GST_RATES.map((rate) => (
                          <option key={rate} value={rate}>{rate}%</option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <div className="col-span-2 flex items-end justify-between gap-2 sm:col-span-1 sm:block sm:text-right">
                    <span className="mb-1 block text-xs font-medium text-slate-500">Amount</span>
                    <span className="block py-2 text-sm font-semibold tabular-nums text-slate-800">{formatMoney(line?.total ?? 0)}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(item.key)}
                disabled={items.length === 1}
                className="btn-icon mt-6 shrink-0 hover:bg-fire-50! hover:text-fire-600!"
                aria-label={`Remove item ${index + 1}`}
                title="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        );
      })}

      {errors.items && <p className="text-sm font-medium text-fire-600">{errors.items}</p>}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-start">
        <SearchSelect
          name="add-product"
          selected={null}
          onSelect={addProduct}
          fetchOptions={fetchProductOptions}
          placeholder="Add a product from inventory..."
          emptyText="No products found. Add products in Products & Inventory."
          className="sm:flex-1"
        />
        <button type="button" className="btn-secondary" onClick={() => onChange([...items, createLineItem()])}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add custom item / service
        </button>
      </div>
    </div>
  );
}
