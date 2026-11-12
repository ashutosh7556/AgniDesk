import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { BarChart3, Boxes, CreditCard, FileSpreadsheet, Loader2, PiggyBank, Receipt, ShoppingCart, Wallet, Wrench } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader.jsx';
import SectionCard from '../../components/ui/SectionCard.jsx';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States.jsx';
import SalesOverviewChart from '../../components/dashboard/SalesOverviewChart.jsx';
import { exportReport, getReport } from '../../services/reportService.js';
import { useFetch } from '../../hooks/useFetch.js';
import { useToast } from '../../hooks/useToast.js';
import { downloadBlob } from '../../utils/documentFiles.js';
import { formatDate, formatMoney } from '../../utils/format.js';
import { todayIST } from '../../utils/dates.js';

const REPORTS = [
  { key: 'sales', label: 'Sales', icon: ShoppingCart, hint: 'Daily / monthly sales with GST' },
  { key: 'profit-loss', label: 'Profit & Loss', icon: PiggyBank, hint: 'Income, expenses and profit' },
  { key: 'pending-payments', label: 'Pending Payments', icon: Receipt, hint: 'Unpaid invoices by age' },
  { key: 'payments', label: 'Payments Received', icon: CreditCard, hint: 'Money received by mode' },
  { key: 'product-sales', label: 'Product Sales', icon: BarChart3, hint: 'What sold, how much' },
  { key: 'inventory', label: 'Inventory', icon: Boxes, hint: 'Current stock and value' },
  { key: 'services', label: 'Services', icon: Wrench, hint: 'Service visits and charges' },
  { key: 'expenses', label: 'Expenses', icon: Wallet, hint: 'Expenses by category' },
];

const shiftMonth = (iso, months) => {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
};
const lastDayOfMonth = (firstDay) => {
  const d = new Date(`${firstDay}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1, 0);
  return d.toISOString().slice(0, 10);
};

/** Date presets (Indian financial year starts 1 April). */
function presetRange(preset) {
  const today = todayIST();
  const thisMonth = `${today.slice(0, 7)}-01`;
  const year = Number(today.slice(0, 4));
  const fyStartYear = Number(today.slice(5, 7)) >= 4 ? year : year - 1;
  switch (preset) {
    case 'last-month': {
      const from = shiftMonth(thisMonth, -1);
      return { from, to: lastDayOfMonth(from) };
    }
    case 'last-3-months':
      return { from: shiftMonth(thisMonth, -2), to: today };
    case 'this-fy':
      return { from: `${fyStartYear}-04-01`, to: today };
    case 'last-fy':
      return { from: `${fyStartYear - 1}-04-01`, to: `${fyStartYear}-03-31` };
    default:
      return { from: thisMonth, to: today };
  }
}

const formatCell = (value, type) => {
  if (value === '' || value === null || value === undefined) return '—';
  if (type === 'money') return formatMoney(value);
  if (type === 'date' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value);
  if (type === 'number') return Number(value).toLocaleString('en-IN');
  return value;
};

const controlClass =
  'rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-flame-500 focus:outline-none focus:ring-2 focus:ring-flame-100';

export default function ReportsPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const type = REPORTS.some((r) => r.key === searchParams.get('type')) ? searchParams.get('type') : 'sales';
  const [preset, setPreset] = useState('this-month');
  const [range, setRange] = useState(() => presetRange('this-month'));
  const [isExporting, setIsExporting] = useState(false);

  const { data: report, error, isLoading, reload } = useFetch((signal) => getReport(type, range, signal), [type, range.from, range.to]);
  const active = REPORTS.find((r) => r.key === type);

  const choosePreset = (value) => {
    setPreset(value);
    if (value !== 'custom') setRange(presetRange(value));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportReport(type, range);
      const suffix = report?.period ? `${range.from}_to_${range.to}` : todayIST();
      downloadBlob(blob, `AgniDesk-${type}-${suffix}.xlsx`);
      toast.success('Excel report downloaded.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsExporting(false);
    }
  };

  // Simple trend chart for sales by day/month (one series)
  const chartData = type === 'sales' && report?.rows.length > 1 && report.rows.length <= 31
    ? report.rows.map((r) => ({ month: report.title === 'Daily Sales' ? r.period.slice(8, 10) : r.period.slice(0, 3), sales: r.total }))
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        subtitle="Business reports with Excel export"
        actions={
          <button type="button" className="btn-primary" onClick={handleExport} disabled={isExporting || !report}>
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />}
            Export to Excel
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="tablist" aria-label="Report type">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const isActive = r.key === type;
          return (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setSearchParams({ type: r.key })}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${isActive ? 'border-flame-500 bg-flame-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${isActive ? 'text-flame-600' : 'text-slate-400'}`} aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">{r.label}</span>
                <span className="block truncate text-xs text-slate-500">{r.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {type !== 'inventory' && (
        <div className="card flex flex-col gap-3 p-4 md:flex-row md:flex-wrap md:items-end">
          <div>
            <label htmlFor="preset" className="mb-1.5 block text-xs font-medium text-slate-500">Period</label>
            <select id="preset" value={preset} onChange={(e) => choosePreset(e.target.value)} className={controlClass}>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="last-3-months">Last 3 months</option>
              <option value="this-fy">This financial year</option>
              <option value="last-fy">Last financial year</option>
              <option value="custom">Custom range</option>
            </select>
          </div>
          <div>
            <label htmlFor="from" className="mb-1.5 block text-xs font-medium text-slate-500">{type === 'pending-payments' ? 'From (not used)' : 'From'}</label>
            <input id="from" type="date" value={range.from} max={range.to} onChange={(e) => { setPreset('custom'); setRange((r) => ({ ...r, from: e.target.value })); }} className={controlClass} disabled={type === 'pending-payments'} />
          </div>
          <div>
            <label htmlFor="to" className="mb-1.5 block text-xs font-medium text-slate-500">{type === 'pending-payments' ? 'As of' : 'To'}</label>
            <input id="to" type="date" value={range.to} min={range.from} onChange={(e) => { setPreset('custom'); setRange((r) => ({ ...r, to: e.target.value })); }} className={controlClass} />
          </div>
        </div>
      )}

      {error && !report && <div className="card"><ErrorState message={error.message} onRetry={reload} /></div>}
      {isLoading && !report && <LoadingState label="Building report..." />}

      {report && (
        <div className={`space-y-6 transition-opacity ${isLoading ? 'opacity-60' : ''}`}>
          {report.note && <p className="rounded-lg bg-slate-100 px-4 py-2.5 text-xs text-slate-600">{report.note}</p>}

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {report.summary.map((item) => (
              <div key={item.label} className="card min-w-0 p-3 sm:p-4">
                <p className="text-xs font-medium text-slate-500">{item.label}</p>
                <p className={`mt-1 break-words text-base font-bold tabular-nums sm:text-xl ${item.type === 'money' && item.value < 0 ? 'text-fire-600' : 'text-slate-900'}`}>
                  {formatCell(item.value, item.type)}
                </p>
              </div>
            ))}
          </div>

          {chartData && (
            <SectionCard title="Sales trend" subtitle={`${report.title} (incl. GST)`}>
              <SalesOverviewChart data={chartData} />
            </SectionCard>
          )}

          <section className="card min-w-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-slate-900">{report.title}</h2>
                <p className="text-xs text-slate-500">
                  {report.period
                    ? report.periodMode === 'asOf'
                      ? `As of ${formatDate(report.period.to)}`
                      : `${formatDate(report.period.from)} – ${formatDate(report.period.to)}`
                    : 'Current position'}
                  {' · '}
                  {report.rows.length} row{report.rows.length === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            {report.rows.length === 0 ? (
              <EmptyState icon={active.icon} title="No records" message="Nothing to show for this period." />
            ) : (
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      {report.columns.map((c) => (
                        <th key={c.key} scope="col" className={`whitespace-nowrap px-4 py-3 ${c.type === 'money' || c.type === 'number' ? 'text-right' : ''}`}>{c.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.rows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50/70">
                        {report.columns.map((c) => (
                          <td
                            key={c.key}
                            className={`px-4 py-2.5 ${c.type === 'money' || c.type === 'number' ? 'whitespace-nowrap text-right tabular-nums' : ''} ${c.type === 'money' && row[c.key] < 0 ? 'text-fire-600' : 'text-slate-700'}`}
                          >
                            {formatCell(row[c.key], c.type)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
