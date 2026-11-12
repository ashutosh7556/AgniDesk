import { useState } from 'react';
import { formatCompactINR, formatCurrency } from '../../utils/format.js';

/**
 * Lightweight dependency-free bar chart (single series: monthly sales).
 * Built with plain divs so it is responsive without measuring the container.
 * - recessive gridlines, thin rounded bars anchored to the baseline
 * - per-bar hover/focus tooltip with exact value
 * - visually hidden data table for screen readers
 * If Phase 6 reports need many chart types, consider a chart library then.
 */
const GRID_STEPS = 4;

const niceCeiling = (value) => {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * magnitude >= value / GRID_STEPS) * magnitude;
  return step * GRID_STEPS;
};

export default function SalesOverviewChart({ data }) {
  const [activeIndex, setActiveIndex] = useState(null);
  const maxValue = niceCeiling(Math.max(...data.map((d) => d.sales)));
  const gridValues = Array.from({ length: GRID_STEPS + 1 }, (_, i) => (maxValue / GRID_STEPS) * (GRID_STEPS - i));

  return (
    <div>
      <div className="flex gap-3">
        {/* Y axis labels */}
        <div className="relative h-64 w-10 shrink-0 text-right text-[11px] text-slate-400" aria-hidden="true">
          {gridValues.map((value, i) => (
            <span
              key={value}
              className="absolute right-0 -translate-y-1/2 leading-none"
              style={{ top: `${(i / GRID_STEPS) * 100}%` }}
            >
              {formatCompactINR(value)}
            </span>
          ))}
        </div>

        {/* Plot area */}
        <div className="relative h-64 flex-1" aria-hidden="true">
          {gridValues.map((value, i) => (
            <div
              key={value}
              className={`absolute inset-x-0 border-t ${i === GRID_STEPS ? 'border-slate-300' : 'border-dashed border-slate-200'}`}
              style={{ top: `${(i / GRID_STEPS) * 100}%` }}
            />
          ))}

          <div className="absolute inset-0 flex items-end justify-around gap-2 sm:gap-4">
            {data.map((point, index) => {
              const heightPct = (point.sales / maxValue) * 100;
              const isActive = activeIndex === index;
              return (
                <div
                  key={point.month}
                  className="relative flex h-full flex-1 cursor-default items-end justify-center"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {isActive && (
                    <div
                      className="pointer-events-none absolute z-10 -translate-y-2 whitespace-nowrap rounded-md bg-navy-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
                      style={{ bottom: `${heightPct}%` }}
                    >
                      <span className="block text-[10px] text-slate-300">{point.month}</span>
                      <span className="font-semibold">{formatCurrency(point.sales)}</span>
                    </div>
                  )}
                  <div
                    className={`w-full max-w-10 rounded-t transition-colors ${isActive ? 'bg-fire-600' : 'bg-flame-500'}`}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis labels */}
      <div className="mt-2 flex gap-3" aria-hidden="true">
        <div className="w-10 shrink-0" />
        <div className="flex flex-1 justify-around gap-2 sm:gap-4">
          {data.map((point) => (
            <span key={point.month} className="flex-1 text-center text-xs text-slate-500">
              {point.month}
            </span>
          ))}
        </div>
      </div>

      <table className="sr-only">
        <caption>Monthly sales, last {data.length} months</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Sales</th>
          </tr>
        </thead>
        <tbody>
          {data.map((point) => (
            <tr key={point.month}>
              <td>{point.month}</td>
              <td>{formatCurrency(point.sales)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
