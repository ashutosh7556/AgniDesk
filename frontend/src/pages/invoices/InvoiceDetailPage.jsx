import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, Ban, Pencil } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import DocumentView from '../../components/billing/DocumentView.jsx';
import DocumentActions from '../../components/billing/DocumentActions.jsx';
import InvoicePayments from '../../components/billing/InvoicePayments.jsx';
import { InvoiceTypeBadge, PaymentStatusBadge } from '../../components/billing/StatusBadges.jsx';
import { cancelInvoice, getInvoice, getInvoicePdf } from '../../services/invoiceService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { messageSignature, useSettings } from '../../hooks/useSettings.js';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { settings } = useSettings();
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
  const hasPayments = invoice.amountPaid > 0;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelInvoice(invoice.id);
      toast.success(`Invoice ${invoice.number} cancelled. Stock has been restored.`);
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
    messageSignature(settings);

  return (
    <div className="space-y-6">
      {backLink}

      {isCancelled && (
        <div role="status" className="flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-4 py-3 text-sm text-slate-700">
          <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />
          This invoice is cancelled. It keeps its number for GST records but no longer counts towards sales, stock or pending payments.
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
              <button
                type="button"
                className="btn-secondary text-fire-600! hover:bg-fire-50!"
                onClick={() => (hasPayments ? toast.error('Delete the recorded payments (refund) before cancelling this invoice.') : setIsCancelOpen(true))}
              >
                <Ban className="h-4 w-4" aria-hidden="true" />
                Cancel invoice
              </button>
            </>
          )}
        </div>
      </div>

      <DocumentView document={invoice} kind="invoice" sidebarExtra={<InvoicePayments invoice={invoice} onChange={reload} />} />

      <ConfirmDialog
        isOpen={isCancelOpen}
        title="Cancel invoice?"
        message={
          <>
            Invoice <strong className="text-slate-800">{invoice.number}</strong> will be marked as cancelled and its items returned to stock.
            Invoices are never deleted, so the number stays in your records. This cannot be undone.
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
