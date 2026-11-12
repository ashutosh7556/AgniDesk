/**
 * PHASE 1 SAMPLE DATA - realistic placeholders for dashboard UI development.
 * Replaced by real API data (backed by Excel storage) in later phases.
 * Dates are generated relative to today so reminders never look stale.
 */

const offsetDate = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

export const summaryStats = {
  todaySales: 18450,
  todaySalesChange: 12.4,
  monthlySales: 386200,
  monthlySalesChange: 8.1,
  totalExpenses: 142750,
  estimatedProfit: 243450,
  pendingPayments: 67300,
  pendingInvoices: 9,
  totalCustomers: 128,
  newCustomersThisMonth: 7,
  totalInvoices: 342,
  invoicesThisMonth: 31,
  availableStock: 864,
  lowStockItems: 4,
};

/** Monthly sales for the last 6 months (INR). */
export const salesOverview = [
  { month: 'Jun', sales: 242000 },
  { month: 'Jul', sales: 298500 },
  { month: 'Aug', sales: 276300 },
  { month: 'Sep', sales: 331800 },
  { month: 'Oct', sales: 357200 },
  { month: 'Nov', sales: 386200 },
];

export const upcomingServices = [
  {
    id: 'SRV-1042',
    customer: 'Shree Ganesh Textiles',
    serviceType: 'Fire Extinguisher Refilling',
    equipment: 'ABC Powder 6kg x 12',
    dueDate: offsetDate(-1),
  },
  {
    id: 'SRV-1043',
    customer: 'Green Park Residency',
    serviceType: 'Hydrant Flow & Pressure Test',
    equipment: 'Wet riser system',
    dueDate: offsetDate(1),
  },
  {
    id: 'SRV-1044',
    customer: 'Patel Diamonds Pvt. Ltd.',
    serviceType: 'AMC Quarterly Inspection',
    equipment: 'CO2 4.5kg x 8',
    dueDate: offsetDate(3),
  },
  {
    id: 'SRV-1045',
    customer: 'Sai Krupa Hospital',
    serviceType: 'Smoke Alarm Inspection',
    equipment: 'Smoke detectors x 40',
    dueDate: offsetDate(6),
  },
  {
    id: 'SRV-1046',
    customer: 'Royal Heights Apartments',
    serviceType: 'Fire NOC Assistance',
    equipment: 'Site audit',
    dueDate: offsetDate(10),
  },
];

/** type: invoice | payment | quotation | service | expense | customer */
export const recentActivity = [
  {
    id: 1,
    type: 'invoice',
    title: 'Invoice INV-2026-0342 created',
    detail: 'Shree Ganesh Textiles · ₹24,780 (GST)',
    time: '25 min ago',
  },
  {
    id: 2,
    type: 'payment',
    title: 'Payment received',
    detail: 'Patel Diamonds Pvt. Ltd. · ₹15,000',
    time: '1 hr ago',
  },
  {
    id: 3,
    type: 'service',
    title: 'Service completed',
    detail: 'Hydrant test at Surat Mall · Certificate pending',
    time: '3 hr ago',
  },
  {
    id: 4,
    type: 'quotation',
    title: 'Quotation QT-2026-0118 sent',
    detail: 'Royal Heights Apartments · ₹1,12,500',
    time: 'Yesterday',
  },
  {
    id: 5,
    type: 'expense',
    title: 'Expense recorded',
    detail: 'Transportation · ₹2,400',
    time: 'Yesterday',
  },
  {
    id: 6,
    type: 'customer',
    title: 'New customer added',
    detail: 'Sai Krupa Hospital',
    time: '2 days ago',
  },
];

export const inventoryOverview = [
  { id: 'P-001', name: 'ABC Powder Extinguisher 6kg', category: 'Fire Extinguisher', quantity: 46, reorderLevel: 15 },
  { id: 'P-002', name: 'CO2 Extinguisher 4.5kg', category: 'Fire Extinguisher', quantity: 9, reorderLevel: 10 },
  { id: 'P-003', name: 'Hydrant Hose Pipe 63mm (15m)', category: 'Hydrant', quantity: 14, reorderLevel: 6 },
  { id: 'P-004', name: 'Landing Valve (Single Headed)', category: 'Hydrant', quantity: 3, reorderLevel: 5 },
  { id: 'P-005', name: 'Smoke Detector (Photoelectric)', category: 'Safety', quantity: 72, reorderLevel: 25 },
  { id: 'P-006', name: 'Fire Safety Signage Kit', category: 'Safety', quantity: 4, reorderLevel: 10 },
];
