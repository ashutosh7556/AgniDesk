import { Link } from 'react-router';
import {
  AlertCircle,
  Boxes,
  IndianRupee,
  PiggyBank,
  Plus,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import SectionCard from '../components/ui/SectionCard.jsx';
import ViewAllLink from '../components/ui/ViewAllLink.jsx';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States.jsx';
import SalesOverviewChart from '../components/dashboard/SalesOverviewChart.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';
import InventoryOverview from '../components/dashboard/InventoryOverview.jsx';
import RemindersList from '../components/services/RemindersList.jsx';
import { getDashboard } from '../services/dashboardService.js';
import { useAuth } from '../hooks/useAuth.js';
import { useFetch } from '../hooks/useFetch.js';
import { formatCurrency } from '../utils/format.js';

const todayLabel = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error, isLoading, reload } = useFetch((signal) => getDashboard(signal), []);

  if (error && !data) return <div className="card"><ErrorState message={error.message} onRetry={reload} /></div>;
  if (isLoading && !data) return <LoadingState label="Loading dashboard..." />;

  const s = data.summary;
  const change = (value) => (value === null ? undefined : value);
  const stats = [
    { label: "Today's Sales", value: formatCurrency(s.todaySales), icon: IndianRupee, tone: 'flame', change: change(s.todaySalesChange), hint: s.todaySalesChange === null ? 'Incl. GST' : 'vs yesterday' },
    { label: 'Monthly Sales', value: formatCurrency(s.monthlySales), icon: ShoppingCart, tone: 'fire', change: change(s.monthlySalesChange), hint: s.monthlySalesChange === null ? 'This month' : 'vs same days last month' },
    { label: 'Expenses', value: formatCurrency(s.totalExpenses), icon: Wallet, tone: 'navy', hint: 'This month' },
    { label: 'Estimated Profit', value: formatCurrency(s.estimatedProfit), icon: PiggyBank, tone: s.estimatedProfit < 0 ? 'fire' : 'green', hint: 'Sales excl. GST − expenses' },
    { label: 'Pending Payments', value: formatCurrency(s.pendingPayments), icon: AlertCircle, tone: 'fire', hint: `${s.pendingInvoices} unpaid invoice${s.pendingInvoices === 1 ? '' : 's'}` },
    { label: 'Total Customers', value: s.totalCustomers, icon: Users, tone: 'navy', hint: `+${s.newCustomersThisMonth} this month` },
    { label: 'Total Invoices', value: s.totalInvoices, icon: Receipt, tone: 'gold', hint: `${s.invoicesThisMonth} this month` },
    { label: 'Available Stock', value: `${s.availableStock} units`, icon: Boxes, tone: 'gold', hint: `${s.lowStockItems} item${s.lowStockItems === 1 ? '' : 's'} low` },
  ];
  const hasSales = data.salesOverview.some((m) => m.sales > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">Welcome back, {user?.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{todayLabel}</p>
        </div>
        <div className="flex gap-2">
          <Link to="/quotations/new" className="btn-secondary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Quotation
          </Link>
          <Link to="/invoices/new" className="btn-primary">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Sales Overview" subtitle="Monthly sales (incl. GST), last 6 months" className="xl:col-span-2">
          {hasSales ? (
            <SalesOverviewChart data={data.salesOverview} />
          ) : (
            <EmptyState icon={ShoppingCart} title="No sales yet" message="Sales appear here once you create invoices." />
          )}
        </SectionCard>
        <SectionCard title="Upcoming Services" subtitle={s.servicesOverdue ? `${s.servicesOverdue} overdue · ${s.servicesDueSoon} due in 30 days` : `${s.servicesDueSoon} due in 30 days`} action={<ViewAllLink to="/services" />}>
          <RemindersList reminders={data.upcomingServices} compact />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Inventory Overview" subtitle="Low-stock items first" action={<ViewAllLink to="/products" />} className="xl:col-span-2">
          <InventoryOverview products={data.inventory} />
        </SectionCard>
        <SectionCard title="Recent Activity" subtitle="Latest business events">
          <RecentActivity items={data.recentActivity} />
        </SectionCard>
      </div>
    </div>
  );
}
