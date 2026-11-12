import { TrendingDown, TrendingUp } from 'lucide-react';

/**
 * Summary metric card.
 * tone controls the icon chip colour only; values always use text colours.
 */
const TONES = {
  fire: 'bg-fire-50 text-fire-600',
  flame: 'bg-flame-50 text-flame-600',
  gold: 'bg-gold-100 text-amber-700',
  navy: 'bg-slate-100 text-navy-800',
  green: 'bg-emerald-50 text-emerald-700',
};

export default function StatCard({ label, value, icon: Icon, tone = 'navy', change, hint }) {
  const hasChange = typeof change === 'number';
  const isPositive = hasChange && change >= 0;

  return (
    <div className="card flex items-start gap-4 p-5">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${TONES[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {(hasChange || hint) && (
          <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
            {hasChange && (
              <span className={`inline-flex items-center gap-0.5 font-semibold ${isPositive ? 'text-emerald-700' : 'text-fire-600'}`}>
                {isPositive ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
                {isPositive ? '+' : ''}
                {change}%
              </span>
            )}
            {hint && <span className="truncate">{hint}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
