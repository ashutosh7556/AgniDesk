import { AlertTriangle, Ban, CalendarClock, CheckCircle2, Clock } from 'lucide-react';

const badge = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset';

const STATUS = {
  scheduled: { label: 'Scheduled', icon: CalendarClock, classes: 'bg-sky-50 text-sky-700 ring-sky-200' },
  completed: { label: 'Completed', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  cancelled: { label: 'Cancelled', icon: Ban, classes: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

export function ServiceStatusBadge({ status }) {
  const config = STATUS[status] ?? STATUS.scheduled;
  const Icon = config.icon;
  return (
    <span className={`${badge} ${config.classes}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}

/** Due-date urgency: icon + text, never colour alone. */
export function DueBadge({ daysLeft, kind }) {
  let config;
  if (daysLeft < 0) config = { label: `Overdue ${Math.abs(daysLeft)}d`, icon: AlertTriangle, classes: 'bg-fire-50 text-fire-700 ring-fire-200' };
  else if (daysLeft === 0) config = { label: kind === 'scheduled' ? 'Today' : 'Due today', icon: Clock, classes: 'bg-flame-50 text-flame-600 ring-flame-100' };
  else if (daysLeft <= 7) config = { label: `In ${daysLeft} day${daysLeft > 1 ? 's' : ''}`, icon: Clock, classes: 'bg-gold-100 text-amber-800 ring-amber-200' };
  else config = { label: `In ${daysLeft} days`, icon: CalendarClock, classes: 'bg-slate-100 text-slate-600 ring-slate-200' };
  const Icon = config.icon;
  return (
    <span className={`${badge} ${config.classes}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}
