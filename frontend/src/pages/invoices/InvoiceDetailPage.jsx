import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Ban, IndianRupee, Loader2, Pencil } from 'lucide-react';
import Modal from '../../components/ui/Modal.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import { TextField } from '../../components/ui/FormControls.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import DocumentView from '../../components/billing/DocumentView.jsx';
import DocumentActions from '../../components/billing/DocumentActions.jsx';
import { InvoiceTypeBadge, PaymentStatusBadge } from '../../components/billing/StatusBadges.jsx';
import { cancelInvoice, getInvoice, getInvoicePdf, updateInvoicePayment } from '../../services/invoiceService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { BUSINESS } from '../../constants/business.js';

function PaymentModal({ invoice, isOpen, onClose, onSaved }) {
  const toast = useToast();
  const [value, setValue] = useState(String(invoice.amountPaid));
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const amount = Number(value);
    if (value === '' || !Number.isFinite(amount) || amount < 0) return setError('Enter a valid amount.');
    if (amount > invoice.grandTotal) return setError('Amount cannot be more than the invoice total.');
    setIsSaving(true);
    try {
      const updated = await updateInvoicePayment(invoice.id, amount);
      toast.success('Payment updated.');
      onSaved(updated);
    } catch (err) {
      setError(err.fieldErrors?.amountPaid ?? err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? () => {} : onClose}
      title="Update payment"
      description={`${invoice.number} · Total ${formatMoney(invoice.grandTotal)}`}
      size="sm"
      footer={
        <>
          <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>Cancel</button>
          <button type="submit" form="payment-form" className="btn-primary" disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Save
          </button>
        </>
      }
    >
      <form id="payment-form" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Total amount received"
          name="amountPaid"
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          prefix="₹"
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(''); }}
          error={error}
          hint="Enter the total received so far, not just this payment."
        />
        <button type="button" className="btn-ghost mt-2 px-2! py-1! text-xs" onClick={() => setValue(String(invoice.grandTotal))}>
          Mark fully paid
        </button>
      </form>
    </Modal>
  );
}

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const { data: invoice, error, isLoading, reload } = useFetch((signal) => getInvoice(id, signal), [id]);

  const backLink = (
    <Link to="/invoices" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Invoices
    </Link>
  );

  if (isLoading && !invoice) return <LoadingState label="Loading invoice..." />;
  if (error) return <div className="space-y-4">{backLink}<div className="card"><ErrorState message={error.message} /></div></div>;

  const isCancelled = invoice.status === 'cancelled';

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelInvoice(invoice.id);
      toast.success(`Invoice ${invoice.number} cancelled.`);
      setIsCancelOpen(false);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsCancelling(false);
    }
  };

  const whatsappMessage =
    `Dear ${invoice.customer.name},\n\nPlease find invoice ${invoice.number} dated ${formatDate(invoice.date)} ` +
    `for ${formatMoney(invoice.grandTotal)}.` +
    (invoice.balanceDue > 0 ? ` Balance due: ${formatMoney(invoice.balanceDue)}.` : ' Thank you for your payment.') +
    `\n\nRegards,\n${BUSINESS.name}\n${BUSINESS.phones[0]}`;

  const paymentCard = !isCancelled && (
    <SectionCard title="Payment">
      <div className="flex items-center justify-between gap-3">
        <PaymentStatusBadge status={invoice.paymentStatus} />
        <button type="button" className="btn-secondary py-2! text-xs" onClick={() => setIsPaymentOpen(true)}>
          <IndianRupee className="h-3.5 w-3.5" aria-hidden="true" />
          Update payment
        </button>
      </div>
    </SectionCard>
  );

  return (
    <div className="space-y-6">
      {backLink}

      {isCancelled && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
          This invoice is cancelled. It keeps its number for GST records but no longer counts towards sales or pending payments.
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className={`text-2xl font-bold tracking-tight ${isCancelled ? 'text-slate-400 line-through' : 'text-navy-900'}`}>{invoice.number}</h2>
            <InvoiceTypeBadge type={invoice.invoiceType} />
            <PaymentStatusBadge status={invoice.paymentStatus} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {invoice.customer.name} · {formatDate(invoice.date)} · {formatMoney(invoice.grandTotal)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DocumentActions number={invoice.number} fetchPdf={() => getInvoicePdf(invoice.id)} mobile={invoice.customer.mobile} whatsappMessage={whatsappMessage} />
          {!isCancelled && (
            <>
              <Link to={`/invoices/${invoice.id}/edit`} className="btn-secondary">
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Edit
              </Link>
              <button type="button" className="btn-secondary text-fire-600! hover:bg-fire-50!" onClick={() => setIsCancelOpen(true)}>
                <Ban className="h-4 w-4" aria-hidden="true" />
                Cancel invoice
              </button>
            </>
          )}
        </div>
      </div>

      <DocumentView document={invoice} kind="invoice" sidebarExtra={paymentCard} />

      {isPaymentOpen && (
        <PaymentModal
          invoice={invoice}
          isOpen
          onClose={() => setIsPaymentOpen(false)}
          onSaved={() => {
            setIsPaymentOpen(false);
            reload();
          }}
        />
      )}

      <ConfirmDialog
        isOpen={isCancelOpen}
        title="Cancel invoice?"
        message={
          <>
            Invoice <strong className="text-slate-800">{invoice.number}</strong> will be marked as cancelled. Invoices are never deleted, so the
            number stays in your records. This cannot be undone.
          </>
        }
        confirmLabel="Cancel invoice"
        isProcessing={isCancelling}
        onConfirm={handleCancel}
        onCancel={() => setIsCancelOpen(false)}
      />
    </div>
  );
}
