import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import { TextField, TextareaField } from '../ui/FormControls.jsx';
import { createCustomer, updateCustomer } from '../../services/customerService.js';
import { validateCustomer } from '../../utils/validation.js';
import { useToast } from '../../hooks/useToast.js';

const EMPTY_FORM = { name: '', companyName: '', mobile: '', email: '', address: '', gstNumber: '' };

const toForm = (customer) =>
  customer ? Object.fromEntries(Object.keys(EMPTY_FORM).map((key) => [key, customer[key] ?? ''])) : EMPTY_FORM;

/** Add / edit customer. Pass `customer` to edit, omit it to create. */
export default function CustomerFormModal({ isOpen, customer, onClose, onSaved }) {
  const isEdit = Boolean(customer);
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset the form each time the modal opens.
  useEffect(() => {
    if (isOpen) {
      setForm(toForm(customer));
      setErrors({});
    }
  }, [isOpen, customer]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validateCustomer(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    try {
      const saved = isEdit ? await updateCustomer(customer.id, form) : await createCustomer(form);
      toast.success(isEdit ? 'Customer updated.' : 'Customer added.');
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
      title={isEdit ? 'Edit Customer' : 'Add Customer'}
      description={isEdit ? customer.id : 'Fields marked * are required.'}
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" form="customer-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {isEdit ? 'Save Changes' : 'Add Customer'}
          </button>
        </>
      }
    >
      <form id="customer-form" onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Customer name" name="name" value={form.name} onChange={handleChange} error={errors.name} required maxLength={100} autoComplete="off" />
        <TextField label="Company name" name="companyName" value={form.companyName} onChange={handleChange} error={errors.companyName} maxLength={150} autoComplete="off" />
        <TextField label="Mobile number" name="mobile" type="tel" inputMode="tel" value={form.mobile} onChange={handleChange} error={errors.mobile} required placeholder="98765 43210" maxLength={16} />
        <TextField label="Email" name="email" type="email" value={form.email} onChange={handleChange} error={errors.email} maxLength={150} />
        <TextareaField label="Address" name="address" value={form.address} onChange={handleChange} error={errors.address} className="sm:col-span-2" maxLength={500} />
        <TextField
          label="GST number"
          name="gstNumber"
          value={form.gstNumber}
          onChange={handleChange}
          error={errors.gstNumber}
          hint="Optional. 15 characters, e.g. 24AAACS1234A1Z5"
          maxLength={15}
          className="sm:col-span-2"
          style={{ textTransform: 'uppercase' }}
        />
      </form>
    </Modal>
  );
}
