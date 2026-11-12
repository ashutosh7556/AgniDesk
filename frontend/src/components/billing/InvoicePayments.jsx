import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import Modal from '../ui/Modal.jsx';
import ConfirmDialog from '../ui/ConfirmDialog.jsx';
import SectionCard from '../ui/SectionCard.jsx';
import { TextField } from '../ui/FormControls.jsx';
import { LoadingState } from '../ui/States.jsx';
import { PaymentStatusBadge } from './StatusBadges.jsx';
import { listInvoicePayments, recordPayment } from '../../services/invoiceService.js';
import { deletePayment } from '../../services/paymentService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { todayIST } from '../../utils/dates.js';
import { PAYMENT_MODES } from '../../constants/business.js';

function RecordPaymentModal({ invoice, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({ amount: String(invoice.balanceDue), date: todayIST(), mode: 'Cash', reference: '', note: '' });
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(form.amount);
    const next = {};
    if (!(amount > 0)) next.amount = 'Enter an amount more than 0.';
    else if (amount > invoice.balanceDue) next.amount = `Cannot be more than the balance due (${formatMoney(invoice.balanceDue)}).`;
    if (!form.date) next.date = 'Date is required.';
    setErrors(next);
    if (Object.keys(next).length) return;

    setIsSaving(true);
    try {
      await recordPayment(invoice.id, { ...form, amount, reference: form.reference.trim(), note: form.note.trim() });
      toast.success(`Payment of ${formatMoney(amount)} recorded.`);
      onSaved();
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
      title="Record payment"
      description={`${invoice.number} · Balance due ${formatMoney(invoice.balanceDue)}`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" form="payment-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save payment
          </button>
        </>
      }
    >
      <form id="payment-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <TextField label="Amount" name="amount" type="number" min="0" step="0.01" inputMode="decimal" prefix="₹" value={form.amount} onChange={set('amount')} error={errors.amount} required />
          <TextField label="Date" name="date" type="date" value={form.date} onChange={set('date')} error={errors.date} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="field-mode" className="mb-1.5 block text-sm font-medium text-slate-700">Mode</label>
            <select id="field-mode" value={form.mode} onChange={set('mode')} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100">
              {PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </div>
          <TextField label="Reference" name="reference" value={form.reference} onChange={set('reference')} maxLength={60} placeholder="UTR / cheque no." />
        </div>
        <TextField label="Note" name="note" value={form.note} onChange={set('note')} maxLength={300} />
      </form>
    </Modal>
  );
}

/** Payment history for one invoice, with record / delete. Calls onChange after any change. */
export default function InvoicePayments({ invoice, onChange }) {
  const toast = useToast();
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: payments, isLoading, reload } = useFetch((signal) => listInvoicePayments(invoice.id, signal), [invoice.id, invoice.amountPaid]);

  const isCancelled = invoice.status === 'cancelled';
  const refresh = () => {
    reload();
    onChange();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deletePayment(paymentToDelete.id);
      toast.success('Payment deleted.');
      setPaymentToDelete(null);
      refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SectionCard
      title="Payments"
      action={
        !isCancelled && invoice.balanceDue > 0 && (
          <button type="button" className="btn-primary min-h-9 px-3! py-1.5! text-xs" onClick={() => setIsRecordOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Record
          </button>
        )
      }
    >
      <div className="mb-3 flex items-center justify-between">
        <PaymentStatusBadge status={invoice.paymentStatus} />
        <span className="text-xs text-slate-500">{formatMoney(invoice.amountPaid)} of {formatMoney(invoice.grandTotal)}</span>
      </div>
      {isLoading && !payments ? (
        <LoadingState />
      ) : payments?.length ? (
        <ul className="-mx-5 divide-y divide-slate-100 border-t border-slate-100">
          {payments.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-2 px-5 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-semibold tabular-nums text-slate-800">{formatMoney(p.amount)}</p>
                <p className="truncate text-xs text-slate-500">
                  {formatDate(p.date)} · {p.mode}
                  {p.reference && ` · ${p.reference}`}
                </p>
              </div>
              <button type="button" className="btn-icon shrink-0 hover:bg-fire-50! hover:text-fire-600!" onClick={() => setPaymentToDelete(p)} aria-label={`Delete payment of ${formatMoney(p.amount)}`} title="Delete payment">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-500">{isCancelled ? 'No payments.' : 'No payments recorded yet.'}</p>
      )}

      {isRecordOpen && (
        <RecordPaymentModal
          invoice={invoice}
          onClose={() => setIsRecordOpen(false)}
          onSaved={() => {
            setIsRecordOpen(false);
            refresh();
          }}
        />
      )}
      <ConfirmDialog
        isOpen={Boolean(paymentToDelete)}
        title="Delete payment?"
        message={paymentToDelete && <>The payment of <strong className="text-slate-800">{formatMoney(paymentToDelete.amount)}</strong> on {formatDate(paymentToDelete.date)} will be removed and the balance due will increase.</>}
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setPaymentToDelete(null)}
      />
    </SectionCard>
  );
}
