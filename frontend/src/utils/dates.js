/** Today's date as YYYY-MM-DD in India Standard Time. */
export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

/** "2026-11-12" + 15 -> "2026-11-27" (timezone-safe). */
export const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};
