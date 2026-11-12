import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { SelectField, TextField, TextareaField } from '../ui/FormControls.jsx';
import { createExpense, updateExpense } from '../../services/expenseService.js';
import { EXPENSE_CATEGORIES } from '../../constants/business.js';
import { todayIST } from '../../utils/dates.js';
import { useToast } from '../../hooks/useToast.js';

const emptyForm = () => ({ title: '', category: '', amount: '', date: todayIST(), description: '' });

function validate(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = 'Expense title is required.';
  if (!form.category) errors.category = 'Select a category.';
  if (!(Number(form.amount) > 0)) errors.amount = 'Enter an amount more than 0.';
  if (!form.date) errors.date = 'Date is required.';
  return errors;
}

/** Add / edit expense. Pass `expense` to edit. */
export default function ExpenseFormModal({ isOpen, expense, onClose, onSaved }) {
  const isEdit = Boolean(expense);
  const toast = useToast();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(expense ? { ...expense, amount: String(expense.amount) } : emptyForm());
    setErrors({});
  }, [isOpen, expense]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) return;

    setIsSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        amount: Number(form.amount),
        date: form.date,
        description: form.description.trim(),
      };
      const saved = isEdit ? await updateExpense(expense.id, payload) : await createExpense(payload);
      toast.success(isEdit ? 'Expense updated.' : 'Expense added.');
      onSaved(saved);
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      title={isEdit ? 'Edit Expense' : 'Add Expense'}
      description={isEdit ? expense.id : 'Fields marked * are required.'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" form="expense-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEdit ? 'Save Changes' : 'Add Expense'}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Expense title" name="title" value={form.title} onChange={handleChange} error={errors.title} required maxLength={150} className="sm:col-span-2" placeholder="e.g. Diesel for delivery van" />
        <SelectField label="Category" name="category" value={form.category} onChange={handleChange} error={errors.category} required options={EXPENSE_CATEGORIES} placeholder="Select category" />
        <TextField label="Amount" name="amount" type="number" min="0" step="0.01" inputMode="decimal" prefix="₹" value={form.amount} onChange={handleChange} error={errors.amount} required />
        <TextField label="Date" name="date" type="date" value={form.date} onChange={handleChange} error={errors.date} required />
        <TextareaField label="Description" name="description" value={form.description} onChange={handleChange} error={errors.description} maxLength={1000} className="sm:col-span-2" />
      </form>
    </Modal>
  );
}
