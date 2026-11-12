import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import SearchSelect from '../../components/ui/SearchSelect.jsx';
import { SelectField, TextField, TextareaField } from '../../components/ui/FormControls.jsx';
import { ErrorState, LoadingState } from '../../components/ui/States.jsx';
import EquipmentEditor, { createEquipmentRow } from '../../components/services/EquipmentEditor.jsx';
import { fetchCustomerOptions, toCustomerOption } from '../../components/billing/pickerOptions.js';
import { createService, getService, updateService } from '../../services/serviceRecordService.js';
import { getCustomer } from '../../services/customerService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';
import { addDays, todayIST } from '../../utils/dates.js';
import { SERVICE_STATUS_LABELS, SERVICE_TYPES } from '../../constants/business.js';

const addMonths = (iso, months) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};

/**
 * Initial form state.
 * - editing: the service itself
 * - "Book service" from a reminder (?from=SRV-x): same customer, type, site and equipment, scheduled today
 * - ?customerId=: customer preselected
 */
function initialState({ service, source, customer }) {
  const base = service ?? source;
  const today = todayIST();
  return {
    customer: base?.customer?.id ? toCustomerOption(base.customer) : customer ? toCustomerOption(customer) : null,
    serviceType: base?.serviceType ?? '',
    status: service?.status ?? 'scheduled',
    serviceDate: service?.serviceDate ?? today,
    nextDueDate: service?.nextDueDate ?? '',
    charges: service ? String(service.charges || '') : '',
    technician: base?.technician ?? '',
    siteAddress: base?.siteAddress ?? customer?.address ?? '',
    remarks: service?.remarks ?? '',
    equipment: (base?.equipment ?? []).map((e) => createEquipmentRow({ name: e.name, quantity: String(e.quantity), details: e.details ?? '' })),
  };
}

function validate(state) {
  const errors = {};
  if (!state.customer) errors.customerId = 'Select a customer.';
  if (!state.serviceType) errors.serviceType = 'Select a service type.';
  if (!state.serviceDate) errors.serviceDate = 'Service date is required.';
  if (state.nextDueDate && state.nextDueDate <= state.serviceDate) errors.nextDueDate = 'Next due date must be after the service date.';
  if (state.charges !== '' && !(Number(state.charges) >= 0)) errors.charges = 'Enter a valid amount.';
  state.equipment.forEach((row, i) => {
    if (!row.name.trim()) errors[`equipment.${i}.name`] = 'Equipment name is required.';
    if (!(Number.isInteger(Number(row.quantity)) && Number(row.quantity) >= 1)) errors[`equipment.${i}.quantity`] = 'At least 1.';
  });
  return errors;
}

function ServiceForm({ service, source, customer }) {
  const navigate = useNavigate();
  const toast = useToast();
  const isEdit = Boolean(service);
  const wasCompleted = service?.status === 'completed';
  const [state, setState] = useState(() => initialState({ service, source, customer }));
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const set = (field, value) => {
    setState((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationErrors = validate(state);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length) {
      toast.error('Please correct the highlighted fields.');
      return;
    }
    const payload = {
      customerId: state.customer.value,
      serviceType: state.serviceType,
      status: state.status,
      serviceDate: state.serviceDate,
      nextDueDate: state.nextDueDate,
      charges: state.charges === '' ? 0 : Number(state.charges),
      technician: state.technician.trim(),
      siteAddress: state.siteAddress.trim(),
      remarks: state.remarks.trim(),
      equipment: state.equipment.map((row) => ({ name: row.name.trim(), quantity: Number(row.quantity), details: row.details.trim() })),
    };
    setIsSaving(true);
    try {
      const saved = isEdit ? await updateService(service.id, payload) : await createService(payload);
      toast.success(
        saved.certificateNumber && saved.certificateNumber !== service?.certificateNumber
          ? `Service completed. Certificate ${saved.certificateNumber} issued.`
          : isEdit ? 'Service updated.' : 'Service saved.',
      );
      navigate(`/services/${saved.id}`, { replace: true });
    } catch (error) {
      setErrors(error.fieldErrors ?? {});
      toast.error(error.message);
      setIsSaving(false);
    }
  };

  const errorCount = Object.values(errors).filter(Boolean).length;
  const backTo = isEdit ? `/services/${service.id}` : '/services';
  const statusOptions = wasCompleted ? ['completed'] : ['scheduled', 'completed', 'cancelled'];

  return (
    <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="min-w-0 space-y-6 xl:col-span-2">
        {errorCount > 0 && (
          <div role="alert" className="flex items-center gap-2 rounded-lg border border-fire-200 bg-fire-50 px-4 py-3 text-sm text-fire-700">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            Please correct the {errorCount} highlighted field{errorCount === 1 ? '' : 's'}.
          </div>
        )}
        <SectionCard title="Customer & Service">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SearchSelect
              label="Customer"
              name="customerId"
              required
              selected={state.customer}
              onSelect={(option) => {
                setState((prev) => ({ ...prev, customer: option, siteAddress: prev.siteAddress || option.data.address || '' }));
                setErrors((prev) => ({ ...prev, customerId: undefined }));
              }}
              onClear={() => set('customer', null)}
              fetchOptions={fetchCustomerOptions}
              placeholder="Search customers by name, company or mobile..."
              emptyText="No customers found. Add the customer in Customers first."
              error={errors.customerId}
              className="sm:col-span-2"
            />
            <SelectField label="Service type" name="serviceType" required value={state.serviceType} onChange={(e) => set('serviceType', e.target.value)} options={SERVICE_TYPES} placeholder="Select service type" error={errors.serviceType} />
            <div>
              <label htmlFor="field-status" className="mb-1.5 block text-sm font-medium text-slate-700">Status<span className="ml-0.5 text-fire-600" aria-hidden="true">*</span></label>
              <select id="field-status" value={state.status} onChange={(e) => set('status', e.target.value)} disabled={wasCompleted} className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100 disabled:bg-slate-50">
                {statusOptions.map((s) => <option key={s} value={s}>{SERVICE_STATUS_LABELS[s]}</option>)}
              </select>
              <p className="mt-1.5 text-xs text-slate-500">
                {wasCompleted ? `Certificate ${service.certificateNumber} issued; status is locked.` : 'Choosing "Completed" issues a service certificate.'}
              </p>
            </div>
            <TextareaField label="Site address" name="siteAddress" rows={2} value={state.siteAddress} onChange={(e) => set('siteAddress', e.target.value)} maxLength={500} hint="Defaults to the customer's address." className="sm:col-span-2" />
          </div>
        </SectionCard>

        <SectionCard title="Equipment" subtitle="Extinguishers, hydrants, alarms covered by this visit">
          <EquipmentEditor rows={state.equipment} onChange={(rows) => set('equipment', rows)} errors={errors} />
        </SectionCard>

        <SectionCard title="Observations & Remarks">
          <TextareaField label="Remarks" name="remarks" rows={4} value={state.remarks} onChange={(e) => set('remarks', e.target.value)} maxLength={2000} hint="Printed on the service certificate." />
        </SectionCard>
      </div>

      <div className="xl:col-span-1">
        <div className="space-y-4 xl:sticky xl:top-24">
          <SectionCard title="Schedule & Charges">
            <div className="space-y-4">
              <TextField label="Service date" name="serviceDate" type="date" required value={state.serviceDate} onChange={(e) => set('serviceDate', e.target.value)} error={errors.serviceDate} />
              <div>
                <TextField label="Next service due" name="nextDueDate" type="date" min={addDays(state.serviceDate || todayIST(), 1)} value={state.nextDueDate} onChange={(e) => set('nextDueDate', e.target.value)} error={errors.nextDueDate} hint="Used for reminders. Leave empty if not recurring." />
                <div className="mt-2 flex flex-wrap gap-1">
                  {[['+3 months', 3], ['+6 months', 6], ['+1 year', 12]].map(([label, months]) => (
                    <button key={label} type="button" className="btn-ghost min-h-9 px-3! py-1.5! text-xs" onClick={() => set('nextDueDate', addMonths(state.serviceDate || todayIST(), months))}>
                      {label}
                    </button>
                  ))}
                  {state.nextDueDate && <button type="button" className="btn-ghost min-h-9 px-3! py-1.5! text-xs" onClick={() => set('nextDueDate', '')}>Clear</button>}
                </div>
              </div>
              <TextField label="Charges" name="charges" type="number" min="0" step="0.01" inputMode="decimal" prefix="₹" value={state.charges} onChange={(e) => set('charges', e.target.value)} error={errors.charges} hint="For your records. Bill the customer with an invoice." />
              <TextField label="Technician" name="technician" value={state.technician} onChange={(e) => set('technician', e.target.value)} maxLength={100} />
            </div>
          </SectionCard>
          <div className="flex gap-3">
            <Link to={backTo} className="btn-secondary flex-1">Cancel</Link>
            <button type="submit" className="btn-primary flex-1" disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {isEdit ? 'Save changes' : 'Save service'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

/** /services/new (?from=SRV-x | ?customerId=CUS-x) and /services/:id/edit */
export default function ServiceFormPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from');
  const customerId = searchParams.get('customerId');
  const isEdit = Boolean(id);

  const { data, error, isLoading } = useFetch(async (signal) => {
    if (isEdit) return { service: await getService(id, signal) };
    if (from) return { source: await getService(from, signal).catch(() => null) };
    if (customerId) return { customer: await getCustomer(customerId, signal).catch(() => null) };
    return {};
  }, [id, from, customerId]);

  return (
    <div className="space-y-6">
      <Link to={isEdit ? `/services/${id}` : '/services'} className="-my-2 inline-flex min-h-10 items-center gap-1 py-2 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {isEdit ? 'Back to service' : 'Services'}
      </Link>
      <PageHeader
        title={isEdit ? 'Edit Service' : from ? 'Book Next Service' : 'New Service'}
        subtitle={from && data?.source ? `Follow-up for ${data.source.customerName} · ${data.source.serviceType}` : 'Record a service visit and its equipment.'}
      />
      {error && <div className="card"><ErrorState message={error.message} /></div>}
      {isLoading && !data && <LoadingState />}
      {data && !error && <ServiceForm key={id ?? from ?? customerId ?? 'new'} {...data} />}
    </div>
  );
}
