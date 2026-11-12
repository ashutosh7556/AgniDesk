import { Link } from 'react-router';
import { Plus, Wrench } from 'lucide-react';
import SectionCard from '../ui/SectionCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../ui/States.jsx';
import { ServiceStatusBadge } from '../services/ServiceBadges.jsx';
import { listServices } from '../../services/serviceRecordService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { formatDate } from '../../utils/format.js';

/** Service visits for one customer, newest first. */
export default function CustomerServiceHistory({ customerId }) {
  const { data, error, isLoading, reload } = useFetch((signal) => listServices({ customerId, limit: 10 }, signal), [customerId]);

  const action = (
    <Link to={`/services/new?customerId=${customerId}`} className="btn-secondary px-3! py-1.5! text-xs">
      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
      Service
    </Link>
  );

  return (
    <SectionCard title="Service History" subtitle={data ? `${data.pagination.total} service record${data.pagination.total === 1 ? '' : 's'}` : undefined} action={action}>
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {isLoading && !data && <LoadingState />}
      {data && data.items.length === 0 && <EmptyState icon={Wrench} title="No services yet" message="Record refills, inspections and AMC visits for this customer." />}
      {data && data.items.length > 0 && (
        <ul className="-mx-5 -my-5 divide-y divide-slate-100">
          {data.items.map((s) => (
            <li key={s.id}>
              <Link to={`/services/${s.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{s.serviceType}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(s.serviceDate)}
                    {s.nextDueDate && ` · next due ${formatDate(s.nextDueDate)}`}
                    {s.certificateNumber && ` · ${s.certificateNumber}`}
                  </p>
                </div>
                <ServiceStatusBadge status={s.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
