import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Building2, Mail, MapPin, Pencil, Phone, Receipt, Trash2 } from 'lucide-react';
import SectionCard from '../../components/ui/SectionCard.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx';
import CustomerFormModal from '../../components/customers/CustomerFormModal.jsx';
import { deleteCustomer, getCustomer } from '../../services/customerService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDate } from '../../utils/format.js';

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
        <dd className="mt-0.5 break-words text-sm text-slate-800">{children || <span className="text-slate-400">Not provided</span>}</dd>
      </div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: customer, error, isLoading, reload } = useFetch((signal) => getCustomer(id, signal), [id]);

  const backLink = (
    <Link to="/customers" className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Customers
    </Link>
  );

  if (isLoading && !customer) return <LoadingState label="Loading customer..." />;
  if (error) {
    return (
      <div className="space-y-4">
        {backLink}
        <div className="card">
          <ErrorState message={error.message} onRetry={error.status === 404 || error.status === 400 ? undefined : reload} />
        </div>
      </div>
    );
  }

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCustomer(customer.id);
      toast.success(`${customer.name} deleted.`);
      navigate('/customers', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {backLink}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">{customer.name}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {customer.companyName && <span>{customer.companyName} · </span>}
            {customer.id} · Added {formatDate(customer.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => setIsEditOpen(true)}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </button>
          <button type="button" className="btn-secondary text-fire-600! hover:bg-fire-50!" onClick={() => setIsDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard title="Contact Details">
          <dl className="space-y-4">
            <DetailRow icon={Phone} label="Mobile">
              <a href={`tel:+91${customer.mobile}`} className="text-flame-600 hover:underline">+91 {customer.mobile}</a>
            </DetailRow>
            <DetailRow icon={Mail} label="Email">
              {customer.email && (
                <a href={`mailto:${customer.email}`} className="text-flame-600 hover:underline">{customer.email}</a>
              )}
            </DetailRow>
            <DetailRow icon={Building2} label="GST Number">
              {customer.gstNumber && <span className="font-mono">{customer.gstNumber}</span>}
            </DetailRow>
            <DetailRow icon={MapPin} label="Address">
              {customer.address && <span className="whitespace-pre-line">{customer.address}</span>}
            </DetailRow>
          </dl>
        </SectionCard>

        <SectionCard title="Purchase History" subtitle="Quotations and invoices" className="lg:col-span-2">
          <EmptyState
            icon={Receipt}
            title="No quotations or invoices yet"
            message="This customer's quotations, invoices and purchase history will appear here once billing is added in Phase 3."
          />
        </SectionCard>
      </div>

      <CustomerFormModal
        isOpen={isEditOpen}
        customer={customer}
        onClose={() => setIsEditOpen(false)}
        onSaved={() => {
          setIsEditOpen(false);
          reload();
        }}
      />

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete customer?"
        message={
          <>
            <strong className="text-slate-800">{customer.name}</strong> will be permanently removed. This cannot be undone.
          </>
        }
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
