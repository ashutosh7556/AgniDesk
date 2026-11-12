import { Ban, CheckCircle2, CircleDashed, Clock, TimerOff } from 'lucide-react';

const badge = 'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset';

const PAYMENT = {
  paid: { label: 'Paid', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  partial: { label: 'Partly paid', icon: Clock, classes: 'bg-gold-100 text-amber-800 ring-amber-200' },
  unpaid: { label: 'Unpaid', icon: CircleDashed, classes: 'bg-fire-50 text-fire-700 ring-fire-200' },
  cancelled: { label: 'Cancelled', icon: Ban, classes: 'bg-slate-100 text-slate-600 ring-slate-200' },
};

/** Payment status: icon + text, never colour alone. */
export function PaymentStatusBadge({ status }) {
  const config = PAYMENT[status] ?? PAYMENT.unpaid;
  const Icon = config.icon;
  return (
    <span className={`${badge} ${config.classes}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}

export function InvoiceTypeBadge({ type }) {
  return type === 'gst' ? (
    <span className={`${badge} bg-sky-50 text-sky-700 ring-sky-200`}>GST</span>
  ) : (
    <span className={`${badge} bg-slate-100 text-slate-600 ring-slate-200`}>Non-GST</span>
  );
}

export function ValidityBadge({ isExpired }) {
  return isExpired ? (
    <span className={`${badge} bg-slate-100 text-slate-600 ring-slate-200`}>
      <TimerOff className="h-3 w-3" aria-hidden="true" />
      Expired
    </span>
  ) : (
    <span className={`${badge} bg-emerald-50 text-emerald-700 ring-emerald-200`}>
      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
      Valid
    </span>
  );
}
