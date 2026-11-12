import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, CalendarPlus, CheckCircle2, Loader2, Pencil, Trash2 } from 'lucide-react';
import SectionCard from '../../components/ui/SectionCard.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import DocumentActions from '../../components/billing/DocumentActions.jsx';
import { ServiceStatusBadge } from '../../components/services/ServiceBadges.jsx';
import { completeService, deleteService, getCertificatePdf, getService } from '../../services/serviceRecordService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { messageSignature, useSettings } from '../../hooks/useSettings.js';

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{children || '—'}</dd>
    </div>
  );
}

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { settings } = useSettings();
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { data: service, error, isLoading, reload } = useFetch((signal) => getService(id, signal), [id]);

  const backLink = (
    <Link to="/services?tab=all" className="-my-2 inline-flex min-h-10 items-center gap-1 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Services
    </Link>
  );
  if (isLoading && !service) return <LoadingState label="Loading service..." />;
  if (error) return <div className="space-y-4">{backLink}<div className="card"><ErrorState message={error.message} /></div></div>;

  const isCompleted = service.status === 'completed';
  const customer = service.customer ?? {};

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      const updated = await completeService(service.id);
      toast.success(`Service completed. Certificate ${updated.certificateNumber} issued.`);
      reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteService(service.id);
      toast.success('Service record deleted.');
      navigate('/services?tab=all', { replace: true });
    } catch (err) {
      toast.error(err.message);
      setIsDeleting(false);
    }
  };

  const whatsappMessage =
    `Dear ${customer.name ?? service.customerName},\n\nPlease find the service certificate ${service.certificateNumber} for ` +
    `${service.serviceType} carried out on ${formatDate(service.serviceDate)}.` +
    (service.nextDueDate ? ` Next service is due on ${formatDate(service.nextDueDate)}.` : '') +
    messageSignature(settings);

  return (
    <div className="space-y-6">
      {backLink}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-navy-900">{service.serviceType}</h2>
            <ServiceStatusBadge status={service.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <Link to={`/customers/${service.customerId}`} className="hover:text-flame-600">{service.customerName}</Link> · {formatDate(service.serviceDate)}
            {service.certificateNumber && ` · ${service.certificateNumber}`}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {isCompleted && (
            <DocumentActions number={service.certificateNumber} fetchPdf={() => getCertificatePdf(service.id)} mobile={customer.mobile} whatsappMessage={whatsappMessage} />
          )}
          {service.status === 'scheduled' && (
            <button type="button" className="btn-primary" onClick={handleComplete} disabled={isCompleting}>
              {isCompleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              Mark completed
            </button>
          )}
          {isCompleted && (
            <Link to={`/services/new?from=${service.id}`} className="btn-secondary">
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              Book next
            </Link>
          )}
          <Link to={`/services/${service.id}/edit`} className="btn-secondary">
            <Pencil className="h-4 w-4" aria-hidden="true" />
            Edit
          </Link>
          {!service.certificateNumber && (
            <button type="button" className="btn-secondary text-fire-600! hover:bg-fire-50!" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="min-w-0 space-y-6 xl:col-span-2">
          <SectionCard title="Equipment" subtitle={`${service.equipment.length} item${service.equipment.length === 1 ? '' : 's'}`}>
            {service.equipment.length === 0 ? (
              <p className="text-sm text-slate-500">No equipment listed.</p>
            ) : (
              <div className="-mx-5 -my-5 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th scope="col" className="px-5 py-3">#</th>
                      <th scope="col" className="px-5 py-3">Equipment</th>
                      <th scope="col" className="px-5 py-3 text-right">Qty</th>
                      <th scope="col" className="px-5 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {service.equipment.map((e, i) => (
                      <tr key={i}>
                        <td className="px-5 py-3 text-slate-500">{i + 1}</td>
                        <td className="px-5 py-3 font-medium text-slate-800">{e.name}</td>
                        <td className="px-5 py-3 text-right tabular-nums">{e.quantity}</td>
                        <td className="px-5 py-3 text-slate-600">{e.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
          {service.remarks && (
            <SectionCard title="Observations & Remarks">
              <p className="whitespace-pre-line text-sm text-slate-700">{service.remarks}</p>
            </SectionCard>
          )}
        </div>

        <div className="space-y-6">
          <SectionCard title="Service Details">
            <dl className="divide-y divide-slate-100">
              <Row label="Service date">{formatDate(service.serviceDate)}</Row>
              <Row label="Next due">{service.nextDueDate && formatDate(service.nextDueDate)}</Row>
              <Row label="Charges">{service.charges ? formatMoney(service.charges) : ''}</Row>
              <Row label="Technician">{service.technician}</Row>
              <Row label="Certificate">{service.certificateNumber}</Row>
            </dl>
          </SectionCard>
          <SectionCard title="Customer & Site">
            <div className="space-y-1 text-sm">
              <Link to={`/customers/${service.customerId}`} className="font-semibold text-slate-900 hover:text-flame-600">{customer.name ?? service.customerName}</Link>
              {customer.companyName && <p className="text-slate-700">{customer.companyName}</p>}
              {customer.mobile && <p className="text-slate-500">+91 {customer.mobile}</p>}
              {service.siteAddress && <p className="whitespace-pre-line pt-1 text-slate-500">{service.siteAddress}</p>}
            </div>
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeleteOpen}
        title="Delete service record?"
        message={<>This {service.serviceType.toLowerCase()} record for <strong className="text-slate-800">{service.customerName}</strong> will be permanently deleted.</>}
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </div>
  );
}
