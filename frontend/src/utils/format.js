const inrFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

/** 125000 -> "₹1,25,000" (Indian digit grouping). */
export const formatCurrency = (amount) => inrFormatter.format(amount ?? 0);

/** 125000 -> "₹1.25L", 12500000 -> "₹1.25Cr". For compact axis labels. */
export const formatCompactINR = (amount) => {
  const value = Number(amount) || 0;
  if (value >= 1e7) return `₹${+(value / 1e7).toFixed(2)}Cr`;
  if (value >= 1e5) return `₹${+(value / 1e5).toFixed(2)}L`;
  if (value >= 1e3) return `₹${+(value / 1e3).toFixed(1)}K`;
  return `₹${value}`;
};

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

/** "2026-11-18" -> "18 Nov 2026" */
export const formatDate = (isoDate) => dateFormatter.format(new Date(isoDate));

/** Whole days from today until the given date (negative = overdue). */
export const daysUntil = (isoDate, from = new Date()) => {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const target = new Date(isoDate);
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end - start) / 86_400_000);
};
