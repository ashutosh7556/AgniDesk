import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import DocumentForm from '../../components/billing/DocumentForm.jsx';
import { createQuotation, getQuotation, updateQuotation } from '../../services/quotationService.js';
import { getCustomer } from '../../services/customerService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';

/** /quotations/new (optionally ?customerId=CUS-0001) and /quotations/:id/edit */
export default function QuotationFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const customerId = searchParams.get('customerId');
  const isEdit = Boolean(id);

  const { data, error, isLoading } = useFetch(async (signal) => {
    if (isEdit) return { quotation: await getQuotation(id, signal) };
    if (customerId) return { customer: await getCustomer(customerId, signal).catch(() => null) };
    return {};
  }, [id, customerId]);

  const handleSubmit = async (payload) => {
    const saved = isEdit ? await updateQuotation(id, payload) : await createQuotation(payload);
    toast.success(isEdit ? 'Quotation updated.' : `Quotation ${saved.number} created.`);
    navigate(`/quotations/${saved.id}`, { replace: true });
  };

  const backTo = isEdit ? `/quotations/${id}` : '/quotations';

  return (
    <div className="space-y-6">
      <Link to={backTo} className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isEdit ? 'Back to quotation' : 'Quotations'}
      </Link>
      <PageHeader
        title={isEdit ? `Edit ${data?.quotation?.number ?? 'Quotation'}` : 'New Quotation'}
        subtitle={isEdit ? 'The quotation number stays the same.' : 'The quotation number is assigned automatically when you save.'}
      />
      {error && <div className="card"><ErrorState message={error.message} /></div>}
      {isLoading && !data && <LoadingState />}
      {data && !error && (
        <DocumentForm key={id ?? 'new'} kind="quotation" document={data.quotation} initialCustomer={data.customer} onSubmit={handleSubmit} cancelTo={backTo} />
      )}
    </div>
  );
}
