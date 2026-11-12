import { CreditCard, FileText, Receipt, UserPlus, Wallet, Wrench } from 'lucide-react';

const ACTIVITY_META = {
  invoice: { icon: Receipt, classes: 'bg-flame-50 text-flame-600' },
  payment: { icon: CreditCard, classes: 'bg-emerald-50 text-emerald-700' },
  quotation: { icon: FileText, classes: 'bg-slate-100 text-navy-800' },
  service: { icon: Wrench, classes: 'bg-gold-100 text-amber-700' },
  expense: { icon: Wallet, classes: 'bg-fire-50 text-fire-600' },
  customer: { icon: UserPlus, classes: 'bg-sky-50 text-sky-700' },
};

export default function RecentActivity({ items }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.quotation;
        const Icon = meta.icon;
        return (
          <li key={item.id} className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.classes}`}>
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-800">{item.title}</p>
              <p className="truncate text-xs text-slate-500">{item.detail}</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400">{item.time}</span>
          </li>
        );
      })}
    </ul>
  );
}
