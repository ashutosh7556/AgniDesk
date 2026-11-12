import { Link } from 'react-router';
import { CalendarCheck, CalendarPlus, MessageCircle } from 'lucide-react';
import { DueBadge } from './ServiceBadges.jsx';
import { formatDate } from '../../utils/format.js';
import { messageSignature, useSettings } from '../../hooks/useSettings.js';

/** Pre-filled WhatsApp text reminding the customer about a due/scheduled service. */
export const reminderWhatsAppUrl = (reminder, settings) => {
  const when = formatDate(reminder.date);
  const text =
    reminder.kind === 'scheduled'
      ? `Dear ${reminder.customerName},\n\nThis is a reminder that your ${reminder.serviceType} is scheduled on ${when}.`
      : `Dear ${reminder.customerName},\n\nYour ${reminder.serviceType} ${reminder.daysLeft < 0 ? 'was due' : 'is due'} on ${when}. Please let us know a convenient date for the service visit.`;
  const phone = reminder.customerMobile ? `91${reminder.customerMobile}` : '';
  return `https://wa.me/${phone}?text=${encodeURIComponent(text + messageSignature(settings))}`;
};

/**
 * Upcoming service work. compact: dashboard card (no action buttons).
 * reminders: from GET /api/services/reminders
 */
export default function RemindersList({ reminders, compact = false }) {
  const { settings } = useSettings();
  if (!reminders.length) {
    return <p className="py-6 text-center text-sm text-slate-500">No services due in the next 30 days.</p>;
  }

  return (
    <ul className={compact ? '-my-3 divide-y divide-slate-100' : 'divide-y divide-slate-100'}>
      {reminders.map((r) => (
        <li key={`${r.kind}-${r.serviceId}`} className={`flex flex-col gap-2 py-3 ${compact ? '' : 'px-5 sm:flex-row sm:items-center sm:justify-between'}`}>
          <div className="flex min-w-0 items-start justify-between gap-3 sm:flex-1">
            <div className="min-w-0">
              <Link to={`/services/${r.serviceId}`} className="block truncate text-sm font-semibold text-slate-800 hover:text-flame-600">
                {r.customerName}
              </Link>
              <p className="truncate text-xs text-slate-500">
                {r.kind === 'scheduled' ? 'Scheduled · ' : 'Next due · '}
                {r.serviceType}
                {!compact && r.equipmentSummary && ` · ${r.equipmentSummary}`}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">{formatDate(r.date)}</p>
            </div>
            <DueBadge daysLeft={r.daysLeft} kind={r.kind} />
          </div>
          {!compact && (
            <div className="flex shrink-0 gap-2 sm:ml-4">
              <a href={reminderWhatsAppUrl(r, settings)} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-9 px-3! py-1.5! text-xs text-emerald-700!">
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                Remind
              </a>
              {r.kind === 'due' ? (
                <Link to={`/services/new?from=${r.serviceId}`} className="btn-primary min-h-9 px-3! py-1.5! text-xs">
                  <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                  Book service
                </Link>
              ) : (
                <Link to={`/services/${r.serviceId}`} className="btn-secondary min-h-9 px-3! py-1.5! text-xs">
                  <CalendarCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Open
                </Link>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
