import { TrendingDown, TrendingUp } from 'lucide-react';

/**
 * Summary metric card.
 * Phones (2 per row): compact — icon above the numbers.
 * Tablet/desktop: icon beside the numbers.
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
    <div className="card flex min-w-0 flex-col gap-2.5 p-3.5 sm:flex-row sm:items-start sm:gap-4 sm:p-5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-11 sm:w-11 ${TONES[tone]}`}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
        <p className="mt-0.5 break-words text-lg font-bold leading-tight tracking-tight text-slate-900 sm:mt-1 sm:text-2xl">{value}</p>
        {(hasChange || hint) && (
          <p className="mt-1 flex flex-wrap items-center gap-x-1 text-[11px] text-slate-500 sm:text-xs">
            {hasChange && (
              <span className={`inline-flex items-center gap-0.5 font-semibold ${isPositive ? 'text-emerald-700' : 'text-fire-600'}`}>
                {isPositive ? <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" /> : <TrendingDown className="h-3.5 w-3.5" aria-hidden="true" />}
                {isPositive ? '+' : ''}
                {change}%
              </span>
            )}
            {hint && <span className="line-clamp-2">{hint}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
