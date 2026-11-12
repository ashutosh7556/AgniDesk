import { AlertTriangle, CalendarClock, Clock } from 'lucide-react';
import { daysUntil, formatDate } from '../../utils/format.js';

/** Status always carries icon + text, never colour alone. */
const getDueStatus = (dueDate) => {
  const days = daysUntil(dueDate);
  if (days < 0)
    return { label: `Overdue ${Math.abs(days)}d`, icon: AlertTriangle, classes: 'bg-fire-50 text-fire-700 ring-fire-200' };
  if (days === 0) return { label: 'Due today', icon: Clock, classes: 'bg-flame-50 text-flame-600 ring-flame-100' };
  if (days <= 3)
    return { label: `In ${days} day${days > 1 ? 's' : ''}`, icon: Clock, classes: 'bg-gold-100 text-amber-800 ring-amber-200' };
  return { label: `In ${days} days`, icon: CalendarClock, classes: 'bg-slate-100 text-slate-600 ring-slate-200' };
};

export default function UpcomingServices({ services }) {
  if (services.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No upcoming services.</p>;
  }

  return (
    <ul className="-my-3 divide-y divide-slate-100">
      {services.map((service) => {
        const status = getDueStatus(service.dueDate);
        const StatusIcon = status.icon;
        return (
          <li key={service.id} className="flex items-start justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">{service.customer}</p>
              <p className="truncate text-xs text-slate-500">
                {service.serviceType} · {service.equipment}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{formatDate(service.dueDate)}</p>
            </div>
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${status.classes}`}>
              <StatusIcon className="h-3 w-3" aria-hidden="true" />
              {status.label}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
