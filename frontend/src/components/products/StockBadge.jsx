import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

/** Stock status: icon + text, never colour alone. */
export default function StockBadge({ quantity, threshold }) {
  let config;
  if (quantity === 0) {
    config = { label: 'Out of stock', icon: XCircle, classes: 'bg-fire-50 text-fire-700 ring-fire-200' };
  } else if (quantity <= threshold) {
    config = { label: 'Low stock', icon: AlertTriangle, classes: 'bg-gold-100 text-amber-800 ring-amber-200' };
  } else {
    config = { label: 'In stock', icon: CheckCircle2, classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' };
  }
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${config.classes}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
}
