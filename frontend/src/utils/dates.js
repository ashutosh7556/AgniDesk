/** Today's date as YYYY-MM-DD in India Standard Time. */
export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

/** "2026-11" -> { from: "2026-11-01", to: "2026-11-30" }. Empty input -> no range. */
export const monthRange = (yearMonth) => {
  if (!yearMonth) return { from: undefined, to: undefined };
  const [year, month] = yearMonth.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${yearMonth}-01`, to: `${yearMonth}-${String(lastDay).padStart(2, '0')}` };
};

/** "2026-11-12" -> "November 2026" */
export const monthLabel = (yearMonth) =>
  new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${yearMonth}-01T00:00:00Z`));

/** "2026-11-12" + 15 -> "2026-11-27" (timezone-safe). */
export const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
