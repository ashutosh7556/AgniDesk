import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import DocumentForm from '../../components/billing/DocumentForm.jsx';
import { createInvoice, getInvoice, updateInvoice } from '../../services/invoiceService.js';
import { getCustomer } from '../../services/customerService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';

/** /invoices/new (optionally ?customerId=CUS-0001) and /invoices/:id/edit */
export default function InvoiceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const customerId = searchParams.get('customerId');
  const isEdit = Boolean(id);

  const { data, error, isLoading } = useFetch(async (signal) => {
    if (isEdit) return { invoice: await getInvoice(id, signal) };
    if (customerId) return { customer: await getCustomer(customerId, signal).catch(() => null) };
    return {};
  }, [id, customerId]);

  const handleSubmit = async (payload) => {
    const saved = isEdit ? await updateInvoice(id, payload) : await createInvoice(payload);
    toast.success(isEdit ? 'Invoice updated.' : `Invoice ${saved.number} created.`);
    navigate(`/invoices/${saved.id}`, { replace: true });
  };

  const backTo = isEdit ? `/invoices/${id}` : '/invoices';
  const isCancelled = data?.invoice?.status === 'cancelled';

  return (
    <div className="space-y-6">
      <Link to={backTo} className="-my-2 inline-flex min-h-10 items-center gap-1 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isEdit ? 'Back to invoice' : 'Invoices'}
      </Link>
      <PageHeader
        title={isEdit ? `Edit ${data?.invoice?.number ?? 'Invoice'}` : 'New Invoice'}
        subtitle={isEdit ? 'The invoice number stays the same.' : 'The invoice number is assigned automatically when you save.'}
      />
      {error && <div className="card"><ErrorState message={error.message} /></div>}
      {isLoading && !data && <LoadingState />}
      {isCancelled && <div className="card"><ErrorState message="Cancelled invoices cannot be edited." /></div>}
      {data && !error && !isCancelled && (
        <DocumentForm key={id ?? 'new'} kind="invoice" document={data.invoice} initialCustomer={data.customer} onSubmit={handleSubmit} cancelTo={backTo} />
      )}
    </div>
  );
}
