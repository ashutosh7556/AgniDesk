import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { AlertTriangle, CalendarClock, CheckCircle2, Clock, Plus, Wrench } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import StatCard from '../../components/ui/StatCard.jsx';
import SearchInput from '../../components/ui/SearchInput.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx';
import RemindersList from '../../components/services/RemindersList.jsx';
import { ServiceStatusBadge } from '../../components/services/ServiceBadges.jsx';
import { listReminders, listServices } from '../../services/serviceRecordService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { SERVICE_TYPES } from '../../constants/business.js';

const PAGE_SIZE = 20;
const controlClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100';

function AllServices() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search);
  const { data, error, isLoading, reload } = useFetch(
    (signal) => listServices({ search: debouncedSearch, status, serviceType, page, limit: PAGE_SIZE }, signal),
    [debouncedSearch, status, serviceType, page],
  );
  const services = data?.items ?? [];
  const withPageReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const renderBody = () => {
    if (error && !data) return <ErrorState message={error.message} onRetry={reload} />;
    if (isLoading && !data) return <LoadingState label="Loading services..." />;
    if (services.length === 0) return <EmptyState icon={Wrench} title="No service records found" message="Record refills, inspections, hydrant tests and AMC visits here." />;
    return (
      <div className={`overflow-x-auto transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-3 py-3 sm:px-5">Customer / Service</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 md:table-cell">Date</th>
              <th scope="col" className="hidden px-3 py-3 sm:px-5 lg:table-cell">Next due</th>
              <th scope="col" className="hidden px-3 py-3 text-right sm:px-5 md:table-cell">Charges</th>
              <th scope="col" className="px-3 py-3 sm:px-5">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {services.map((s) => (
              <tr key={s.id} className="cursor-pointer hover:bg-slate-50/70" onClick={() => navigate(`/services/${s.id}`)}>
                <td className="px-3 py-3 sm:px-5">
                  <Link to={`/services/${s.id}`} onClick={(e) => e.stopPropagation()} className="font-semibold text-slate-800 hover:text-flame-600">{s.customerName}</Link>
                  <p className="text-xs text-slate-500">
                    {s.serviceType}
                    <span className="md:hidden"> · {formatDate(s.serviceDate)}</span>
                    {s.certificateNumber && <span className="hidden sm:inline"> · {s.certificateNumber}</span>}
                  </p>
                </td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 sm:px-5 md:table-cell">{formatDate(s.serviceDate)}</td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-slate-600 sm:px-5 lg:table-cell">{s.nextDueDate ? formatDate(s.nextDueDate) : '—'}</td>
                <td className="hidden whitespace-nowrap px-3 py-3 text-right tabular-nums sm:px-5 md:table-cell">{s.charges ? formatMoney(s.charges) : '—'}</td>
                <td className="px-3 py-3 sm:px-5"><ServiceStatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="card min-w-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 md:flex-row md:items-center">
        <SearchInput value={search} onChange={withPageReset(setSearch)} placeholder="Search customer, certificate, technician" className="md:max-w-xs md:flex-1" />
        <select value={serviceType} onChange={(e) => withPageReset(setServiceType)(e.target.value)} aria-label="Filter by service type" className={controlClass}>
          <option value="">All service types</option>
          {SERVICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={status} onChange={(e) => withPageReset(setStatus)(e.target.value)} aria-label="Filter by status" className={controlClass}>
          <option value="">All statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      {renderBody()}
      <Pagination pagination={data?.pagination} onPageChange={setPage} itemLabel="services" />
    </div>
  );
}

function Reminders() {
  const [days, setDays] = useState(30);
  const { data, error, isLoading, reload } = useFetch((signal) => listReminders(days, signal), [days]);
  return (
    <section className="card min-w-0">
      <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Service reminders</h2>
          <p className="text-xs text-slate-500">Overdue and upcoming services, plus scheduled visits.</p>
        </div>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Reminder window" className={controlClass}>
          <option value={7}>Next 7 days</option>
          <option value={30}>Next 30 days</option>
          <option value={90}>Next 90 days</option>
        </select>
      </div>
      {error && <ErrorState message={error.message} onRetry={reload} />}
      {isLoading && !data && <LoadingState />}
      {data && <RemindersList reminders={data} />}
    </section>
  );
}

export default function ServicesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') === 'all' ? 'all' : 'reminders';
  const { data } = useFetch((signal) => listServices({ limit: 1 }, signal), []);
  const s = data?.summary;

  const tabClass = (active) =>
    `rounded-lg px-4 py-2 text-sm font-semibold transition ${active ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-200/60'}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Services"
        subtitle="Refills, inspections, hydrant tests, AMC visits and certificates"
        actions={
          <Link to="/services/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New Service
          </Link>
        }
      />

      {s && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          <StatCard label="Overdue" value={s.overdue} icon={AlertTriangle} tone={s.overdue ? 'fire' : 'navy'} hint="Past next due date" />
          <StatCard label="Due in 30 days" value={s.dueSoon} icon={Clock} tone="gold" hint="Incl. scheduled visits" />
          <StatCard label="Scheduled" value={s.scheduled} icon={CalendarClock} tone="navy" />
          <StatCard label="Completed this month" value={s.completedThisMonth} icon={CheckCircle2} tone="green" />
        </div>
      )}

      <div className="flex gap-2" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'reminders'} className={tabClass(tab === 'reminders')} onClick={() => setSearchParams({})}>
          Reminders
        </button>
        <button type="button" role="tab" aria-selected={tab === 'all'} className={tabClass(tab === 'all')} onClick={() => setSearchParams({ tab: 'all' })}>
          All services
        </button>
      </div>

      {tab === 'reminders' ? <Reminders /> : <AllServices />}
    </div>
  );
}
