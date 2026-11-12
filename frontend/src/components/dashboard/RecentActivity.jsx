import { Link } from 'react-router';
import { CreditCard, FileText, Receipt, UserPlus, Wallet, Wrench } from 'lucide-react';
import { formatMoney } from '../../utils/format.js';

const ACTIVITY_META = {
  invoice: { icon: Receipt, classes: 'bg-flame-50 text-flame-600' },
  payment: { icon: CreditCard, classes: 'bg-emerald-50 text-emerald-700' },
  quotation: { icon: FileText, classes: 'bg-slate-100 text-navy-800' },
  service: { icon: Wrench, classes: 'bg-gold-100 text-amber-700' },
  expense: { icon: Wallet, classes: 'bg-fire-50 text-fire-600' },
  customer: { icon: UserPlus, classes: 'bg-sky-50 text-sky-700' },
};

const relativeTime = (iso) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(iso));
};

/** Backend sends raw numbers in "detail" (e.g. "Ramesh · 28674 · UPI"); format money parts. */
const formatDetail = (detail) => detail.replace(/(^|· )(\d+(?:\.\d+)?)(?= ·|$)/g, (_, sep, n) => `${sep}${formatMoney(Number(n))}`);

export default function RecentActivity({ items }) {
  if (!items.length) return <p className="py-6 text-center text-sm text-slate-500">No activity yet.</p>;
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.quotation;
        const Icon = meta.icon;
        return (
          <li key={`${item.type}-${item.id}`}>
            <Link to={item.link} className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.classes}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{item.title}</p>
                <p className="truncate text-xs text-slate-500">{formatDetail(item.detail)}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">{relativeTime(item.at)}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
