import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import DocumentView from '../../components/billing/DocumentView.jsx';
import DocumentActions from '../../components/billing/DocumentActions.jsx';
import { ValidityBadge } from '../../components/billing/StatusBadges.jsx';
import { deleteQuotation, getQuotation, getQuotationPdf } from '../../services/quotationService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { messageSignature, useSettings } from '../../hooks/useSettings.js';

export default function QuotationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: quotation, error, isLoading } = useFetch((signal) => getQuotation(id, signal), [id]);

  const backLink = (
    <Link to="/quotations" className="-my-2 inline-flex min-h-10 items-center gap-1 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Quotations
    </Link>
  );

  if (isLoading && !quotation) return <LoadingState label="Loading quotation..." />;
  if (error) return <div className="space-y-4">{backLink}<div className="card"><ErrorState message={error.message} /></div></div>;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteQuotation(quotation.id);
      toast.success(`Quotation ${quotation.number} deleted.`);
      navigate('/quotations', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setIsDeleting(false);
    }
  };

  const whatsappMessage =
    `Dear ${quotation.customer.name},\n\nPlease find our quotation ${quotation.number} dated ${formatDate(quotation.date)} ` +
    `for ${formatMoney(quotation.grandTotal)}, valid until ${formatDate(quotation.validUntil)}.\n\n` +
    messageSignature(settings).trimStart();

  return (
    <div className="space-y-6">
      {backLink}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-navy-900">{quotation.number}</h2>
            <ValidityBadge isExpired={quotation.isExpired} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {quotation.customer.name} · {formatDate(quotation.date)} · {formatMoney(quotation.grandTotal)}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <DocumentActions number={quotation.number} fetchPdf={() => getQuotationPdf(quotation.id)} mobile={quotation.customer.mobile} whatsappMessage={whatsappMessage} />
          <Link to={`/quotations/${quotation.id}/edit`} className="btn-secondary">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
          <button type="button" className="btn-secondary text-fire-600! hover:bg-fire-50!" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      <DocumentView document={quotation} kind="quotation" />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete quotation?"
        message={<>Quotation <strong className="text-slate-800">{quotation.number}</strong> will be permanently deleted. This cannot be undone.</>}
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
