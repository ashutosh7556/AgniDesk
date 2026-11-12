import {
  AlertCircle,
  Boxes,
  CalendarClock,
  IndianRupee,
  PiggyBank,
  Receipt,
  ShoppingCart,
  Users,
  Wallet,
} from 'lucide-react';
import StatCard from '../components/ui/StatCard.jsx';
import SectionCard from '../components/ui/SectionCard.jsx';
import ViewAllLink from '../components/ui/ViewAllLink.jsx';
import SalesOverviewChart from '../components/dashboard/SalesOverviewChart.jsx';
import UpcomingServices from '../components/dashboard/UpcomingServices.jsx';
import RecentActivity from '../components/dashboard/RecentActivity.jsx';
import InventoryOverview from '../components/dashboard/InventoryOverview.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { formatCurrency } from '../utils/format.js';
import {
  inventoryOverview,
  recentActivity,
  salesOverview,
  summaryStats as s,
  upcomingServices,
} from '../mocks/dashboardData.js';

const todayLabel = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

export default function DashboardPage() {
  const { user } = useAuth();

  const stats = [
    { label: "Today's Sales", value: formatCurrency(s.todaySales), icon: IndianRupee, tone: 'flame', change: s.todaySalesChange, hint: 'vs yesterday' },
    { label: 'Monthly Sales', value: formatCurrency(s.monthlySales), icon: ShoppingCart, tone: 'fire', change: s.monthlySalesChange, hint: 'vs last month' },
    { label: 'Total Expenses', value: formatCurrency(s.totalExpenses), icon: Wallet, tone: 'navy', hint: 'This month' },
    { label: 'Estimated Profit', value: formatCurrency(s.estimatedProfit), icon: PiggyBank, tone: 'green', hint: 'Sales − expenses' },
    { label: 'Pending Payments', value: formatCurrency(s.pendingPayments), icon: AlertCircle, tone: 'fire', hint: `${s.pendingInvoices} unpaid invoices` },
    { label: 'Total Customers', value: s.totalCustomers, icon: Users, tone: 'navy', hint: `+${s.newCustomersThisMonth} this month` },
    { label: 'Total Invoices', value: s.totalInvoices, icon: Receipt, tone: 'gold', hint: `${s.invoicesThisMonth} this month` },
    { label: 'Available Stock', value: `${s.availableStock} units`, icon: Boxes, tone: 'gold', hint: `${s.lowStockItems} items low` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">Welcome back, {user?.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{todayLabel}</p>
        </div>
        <span className="inline-flex items-center gap-2 self-start rounded-lg bg-gold-100 px-3 py-1.5 text-xs font-semibold text-amber-800 sm:self-auto">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          {upcomingServices.length} services due or overdue
        </span>
      </div>

      <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-2 text-xs text-amber-800">
        Phase 1 preview: all figures below are sample data.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Sales Overview" subtitle="Monthly sales, last 6 months" className="xl:col-span-2">
          <SalesOverviewChart data={salesOverview} />
        </SectionCard>
        <SectionCard title="Upcoming Services" subtitle="Next service due dates" action={<ViewAllLink to="/services" />}>
          <UpcomingServices services={upcomingServices} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <SectionCard title="Inventory Overview" subtitle="Stock levels and low-stock alerts" action={<ViewAllLink to="/products" />} className="xl:col-span-2">
          <InventoryOverview products={inventoryOverview} />
        </SectionCard>
        <SectionCard title="Recent Activity" subtitle="Latest business events">
          <RecentActivity items={recentActivity} />
        </SectionCard>
      </div>
    </div>
  );
}
