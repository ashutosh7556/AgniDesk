import { useState } from 'react';
import { Loader2, Minus, Plus } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { TextField } from '../ui/FormControls.jsx';
import { adjustStock } from '../../services/productService.js';
import { todayIST } from '../../utils/dates.js';
import { useToast } from '../../hooks/useToast.js';

const TYPES = [
  { value: 'purchase', label: 'Stock received', hint: 'New stock bought from a supplier.' },
  { value: 'add', label: 'Add (correction)', hint: 'Found extra units, returned goods...' },
  { value: 'remove', label: 'Remove (correction)', hint: 'Damaged, lost, used for demo...' },
];

/** Record a purchase or a +/- correction. Sales are deducted automatically by invoices. */
export default function StockAdjustModal({ product, onClose, onSaved }) {
  const toast = useToast();
  const [type, setType] = useState('purchase');
  const [quantity, setQuantity] = useState('');
  const [date, setDate] = useState(todayIST());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const qty = Number(quantity);
  const signed = type === 'remove' ? -qty : qty;
  const isValidQty = quantity !== '' && Number.isInteger(qty) && qty > 0;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!isValidQty) nextErrors.quantity = 'Enter a whole number more than 0.';
    if (!date) nextErrors.date = 'Date is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setIsSaving(true);
    try {
      const updated = await adjustStock(product.id, {
        date,
        type: type === 'purchase' ? 'purchase' : 'adjustment',
        quantity: signed,
        note: note.trim(),
      });
      toast.success(`Stock updated. ${updated.name}: ${updated.quantity} available.`);
      onSaved(updated);
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={isSaving ? () => {} : onClose}
      title="Adjust stock"
      description={`${product.name} · ${product.quantity} available now`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" form="stock-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save
          </button>
        </>
      }
    >
      <form id="stock-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="mb-1.5 text-sm font-medium text-slate-700">What happened?</legend>
          {TYPES.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                type === option.value ? 'border-flame-500 bg-flame-50' : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input type="radio" name="type" value={option.value} checked={type === option.value} onChange={() => setType(option.value)} className="mt-1 accent-flame-500" />
              <span>
                <span className="flex items-center gap-1 text-sm font-medium text-slate-800">
                  {option.value === 'remove' ? <Minus className="h-3.5 w-3.5" aria-hidden="true" /> : <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                  {option.label}
                </span>
                <span className="block text-xs text-slate-500">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Quantity" name="quantity" type="number" min="1" step="1" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} error={errors.quantity} required />
          <TextField label="Date" name="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} error={errors.date} required />
        </div>
        <TextField label="Note" name="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={type === 'purchase' ? 'e.g. Supplier bill no. 1234' : 'Reason'} />
        {isValidQty && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Stock will change from <strong>{product.quantity}</strong> to{' '}
            <strong className={product.quantity + signed < 0 ? 'text-fire-600' : 'text-slate-900'}>{product.quantity + signed}</strong>.
          </p>
        )}
      </form>
    </Modal>
  );
}
