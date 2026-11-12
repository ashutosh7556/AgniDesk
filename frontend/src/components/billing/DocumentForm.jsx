import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { AlertCircle, Loader2 } from 'lucide-react';
import SectionCard from '../ui/SectionCard.jsx';
import SearchSelect from '../ui/SearchSelect.jsx';
import { TextField, TextareaField } from '../ui/FormControls.jsx';
import LineItemsEditor, { createLineItem, toEditableLine } from './LineItemsEditor.jsx';
import TotalsSummary from './TotalsSummary.jsx';
import { fetchCustomerOptions, toCustomerOption } from './pickerOptions.js';
import { calculateDocument, detectSupplyType } from '../../utils/billing.js';
import { addDays, todayIST } from '../../utils/dates.js';
import { SELLER_STATE_CODE } from '../../constants/business.js';
import { useToast } from '../../hooks/useToast.js';

/** Default terms for new quotations (editable per quotation). */
const DEFAULT_TERMS = [
  'Prices are valid until the validity date mentioned above.',
  '50% advance with purchase order; balance on delivery/installation.',
  'Delivery within 7 working days from order confirmation, subject to stock availability.',
  'Warranty as per manufacturer terms.',
].join('\n');

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toPayloadItems = (items) =>
  items.map((item) => ({
    productId: item.productId,
    description: item.description.trim(),
    hsnCode: item.hsnCode.trim(),
    quantity: toNumber(item.quantity),
    rate: toNumber(item.rate),
    discountPercent: toNumber(item.discountPercent),
    gstRate: toNumber(item.gstRate),
  }));

function validate(state, kind) {
  const errors = {};
  if (!state.customer) errors.customerId = 'Select a customer.';
  if (!state.date) errors.date = 'Date is required.';
  if (kind === 'quotation') {
    if (!state.validUntil) errors.validUntil = 'Valid until is required.';
    else if (state.validUntil < state.date) errors.validUntil = 'Validity date cannot be before the quotation date.';
  }
  if (state.items.length === 0) errors.items = 'Add at least one item.';
  state.items.forEach((item, i) => {
    if (!item.description.trim()) errors[`items.${i}.description`] = 'Description is required.';
    if (item.hsnCode.trim() && !/^\d{4,8}$/.test(item.hsnCode.trim())) errors[`items.${i}.hsnCode`] = '4–8 digits.';
    if (!(Number(item.quantity) > 0)) errors[`items.${i}.quantity`] = 'Must be more than 0.';
    if (item.rate === '' || !(Number(item.rate) >= 0)) errors[`items.${i}.rate`] = 'Enter a rate.';
    const disc = Number(item.discountPercent);
    if (!(disc >= 0 && disc <= 100)) errors[`items.${i}.discountPercent`] = '0 to 100.';
  });
  return errors;
}

/**
 * Create/edit form shared by quotations and invoices.
 *
 * kind: 'quotation' | 'invoice'
 * document: existing document when editing (null when creating)
 * initialCustomer: customer record to preselect (e.g. from ?customerId=)
 * onSubmit(payload): returns a promise; throws ApiRequestError on failure
 */
export default function DocumentForm({ kind, document, initialCustomer, onSubmit, cancelTo }) {
  const isEdit = Boolean(document);
  const isInvoice = kind === 'invoice';
  const toast = useToast();

  const [state, setState] = useState(() => {
    const today = todayIST();
    const sourceCustomer = document?.customer ?? initialCustomer;
    return {
      customer: sourceCustomer ? toCustomerOption(sourceCustomer) : null,
      date: document?.date ?? today,
      validUntil: document?.validUntil ?? addDays(today, 15),
      taxMode: document?.taxMode ?? 'gst',
      invoiceType: document?.invoiceType ?? 'gst',
      supplyType: document?.supplyType ?? detectSupplyType(sourceCustomer?.gstNumber, SELLER_STATE_CODE),
      items: document?.items?.length ? document.items.map(toEditableLine) : [createLineItem()],
      notes: document?.notes ?? '',
      terms: document?.terms ?? (isInvoice ? '' : DEFAULT_TERMS),
      amountPaid: String(document?.amountPaid ?? 0),
    };
  });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const set = (field, value) => {
    setState((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const taxMode = isInvoice ? (state.invoiceType === 'gst' ? 'gst' : 'none') : state.taxMode;
  const { items: computedLines, totals } = useMemo(
    () => calculateDocument({ items: toPayloadItems(state.items), taxMode, supplyType: state.supplyType }),
    [state.items, taxMode, state.supplyType],
  );
  const amountPaid = toNumber(state.amountPaid);

  const handleCustomerSelect = (option) => {
    setState((prev) => ({
      ...prev,
      customer: option,
      supplyType: detectSupplyType(option.data.gstNumber, SELLER_STATE_CODE),
    }));
    setErrors((prev) => ({ ...prev, customerId: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate(state, kind);
    if (isInvoice && amountPaid > totals.grandTotal) validationErrors.amountPaid = 'Amount paid cannot be more than the invoice total.';
    if (isInvoice && amountPaid < 0) validationErrors.amountPaid = 'Amount paid cannot be negative.';
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast.error('Please correct the highlighted fields.');
      return;
    }

    const payload = {
      customerId: state.customer.value,
      date: state.date,
      supplyType: state.supplyType,
      items: toPayloadItems(state.items),
      notes: state.notes.trim(),
      ...(isInvoice
        ? { invoiceType: state.invoiceType, amountPaid }
        : { taxMode: state.taxMode, validUntil: state.validUntil, terms: state.terms.trim() }),
    };

    setIsSaving(true);
    try {
      await onSubmit(payload);
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
      setIsSaving(false);
    }
  };

  const showGst = taxMode === 'gst';
  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="min-w-0 space-y-6 xl:col-span-2">
        {errorCount > 0 && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-fire-200 bg-fire-50 px-4 py-3 text-sm text-fire-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Please correct the {errorCount} highlighted field{errorCount === 1 ? '' : 's'}.
          </div>
        )}

        <SectionCard title={isInvoice ? 'Invoice Details' : 'Quotation Details'}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SearchSelect
              label="Customer"
              name="customerId"
              required
              selected={state.customer}
              onSelect={handleCustomerSelect}
              onClear={() => set('customer', null)}
              fetchOptions={fetchCustomerOptions}
              placeholder="Search customers by name, company or mobile..."
              emptyText="No customers found. Add the customer in Customers first."
              error={errors.customerId}
              className="sm:col-span-2"
            />

            <TextField label={isInvoice ? 'Invoice date' : 'Quotation date'} name="date" type="date" required value={state.date} onChange={(e) => set('date', e.target.value)} error={errors.date} />

            {isInvoice ? (
              <fieldset>
                <legend className="mb-1.5 block text-sm font-medium text-slate-700">Invoice type<span className="ml-0.5 text-fire-600" aria-hidden="true">*</span></legend>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['gst', 'GST invoice'],
                    ['non-gst', 'Non-GST invoice'],
                  ].map(([value, label]) => (
                    <label
                      key={value}
                      className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                        state.invoiceType === value ? 'border-flame-500 bg-flame-50 text-flame-600' : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      } ${isEdit ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <input type="radio" name="invoiceType" value={value} checked={state.invoiceType === value} onChange={() => set('invoiceType', value)} disabled={isEdit} className="sr-only" />
                      {label}
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                  {isEdit ? 'Invoice type cannot be changed after creation.' : 'GST and Non-GST invoices have separate number series.'}
                </p>
                {errors.invoiceType && <p className="mt-1 text-xs text-fire-600">{errors.invoiceType}</p>}
              </fieldset>
            ) : (
              <TextField label="Valid until" name="validUntil" type="date" required min={state.date} value={state.validUntil} onChange={(e) => set('validUntil', e.target.value)} error={errors.validUntil} />
            )}

            {!isInvoice && (
              <label className="flex cursor-pointer items-center gap-2 self-end pb-2.5 text-sm text-slate-700">
                <input type="checkbox" checked={state.taxMode === 'gst'} onChange={(e) => set('taxMode', e.target.checked ? 'gst' : 'none')} className="h-4 w-4 rounded border-slate-300 accent-flame-500" />
                Include GST in this quotation
              </label>
            )}

            {showGst && (
              <div>
                <label htmlFor="field-supplyType" className="mb-1.5 block text-sm font-medium text-slate-700">Supply type</label>
                <select id="field-supplyType" value={state.supplyType} onChange={(e) => set('supplyType', e.target.value)} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100">
                  <option value="intra">Within Gujarat (CGST + SGST)</option>
                  <option value="inter">Outside Gujarat (IGST)</option>
                </select>
                <p className="mt-1.5 text-xs text-slate-500">Auto-selected from the customer's GSTIN.</p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Items & Services" subtitle="Add products from inventory or type a custom item/service.">
          <LineItemsEditor
            items={state.items}
            computed={computedLines}
            onChange={(items) => {
              // Line errors are keyed by position; drop them when lines are added/removed/replaced.
              const sameLines = items.length === state.items.length && items.every((item, i) => item.key === state.items[i].key);
              if (!sameLines) {
                setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => !key.startsWith('items'))));
              }
              set('items', items);
            }}
            showGst={showGst}
            errors={errors}
            onClearError={(key) => setErrors((prev) => ({ ...prev, [key]: undefined }))}
          />
        </SectionCard>

        <SectionCard title={isInvoice ? 'Notes' : 'Terms & Notes'}>
          <div className="space-y-4">
            {!isInvoice && (
              <TextareaField label="Terms & conditions" name="terms" rows={5} value={state.terms} onChange={(e) => set('terms', e.target.value)} error={errors.terms} maxLength={3000} />
            )}
            <TextareaField
              label="Notes"
              name="notes"
              value={state.notes}
              onChange={(e) => set('notes', e.target.value)}
              error={errors.notes}
              maxLength={1000}
              hint={isInvoice ? 'Printed on the invoice, e.g. bank details or delivery notes.' : 'Printed below the terms.'}
            />
          </div>
        </SectionCard>
      </div>

      <div className="xl:col-span-1">
        <div className="space-y-4 xl:sticky xl:top-24">
          <SectionCard title="Summary">
            <TotalsSummary
              totals={totals}
              taxMode={taxMode}
              supplyType={state.supplyType}
              {...(isInvoice ? { amountPaid, balanceDue: Math.max(totals.grandTotal - amountPaid, 0) } : {})}
            />
            {isInvoice && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <TextField label="Amount received" name="amountPaid" type="number" min="0" step="0.01" inputMode="decimal" prefix="₹" value={state.amountPaid} onChange={(e) => set('amountPaid', e.target.value)} error={errors.amountPaid} />
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn-ghost px-2! py-1! text-xs" onClick={() => set('amountPaid', String(totals.grandTotal))}>Fully paid</button>
                  <button type="button" className="btn-ghost px-2! py-1! text-xs" onClick={() => set('amountPaid', '0')}>Unpaid</button>
                </div>
              </div>
            )}
          </SectionCard>

          <div className="flex gap-3">
            <Link to={cancelTo} className="btn-secondary flex-1">Cancel</Link>
            <button type="submit" className="btn-primary flex-1" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isEdit ? 'Save changes' : isInvoice ? 'Create invoice' : 'Create quotation'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
