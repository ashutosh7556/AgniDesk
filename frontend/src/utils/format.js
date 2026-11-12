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

const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 1234.5 -> "₹1,234.50". For invoices and quotations. */
export const formatMoney = (amount) => moneyFormatter.format(amount ?? 0);

const dateFormatter = new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const dateOnlyFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * "2026-11-18" -> "18 Nov 2026". Date-only strings are formatted in UTC so
 * they never shift by a day in other timezones; full timestamps use local time.
 */
export const formatDate = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? dateOnlyFormatter.format(new Date(`${value}T00:00:00Z`))
    : dateFormatter.format(new Date(value));

/** Whole days from today until the given date (negative = overdue). */
export const daysUntil = (isoDate, from = new Date()) => {
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const target = new Date(isoDate);
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end - start) / 86_400_000);
};
