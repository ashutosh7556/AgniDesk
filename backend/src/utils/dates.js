/** Today's date as YYYY-MM-DD in India Standard Time (server may run in UTC). */
export const todayIST = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

/** Indian financial year (Apr–Mar) for a YYYY-MM-DD date: "2026-11-12" -> "2026-27". */
export const financialYear = (isoDate) => {
  const [year, month] = isoDate.split('-').map(Number);
  const start = month >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
};

/** Valid calendar date in YYYY-MM-DD form. */
export const isValidIsoDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};
