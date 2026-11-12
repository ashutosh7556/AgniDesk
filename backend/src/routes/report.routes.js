import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { buildReport, REPORTS } from '../services/report.service.js';
import { getSettings } from '../services/settings.service.js';
import { reportToExcel } from '../utils/reportExcel.js';
import { isValidIsoDate, todayIST } from '../utils/dates.js';

/** Reports (JSON for the screen, .xlsx for download). Mounted behind requireAuth. */
const router = Router();

const params = z.object({ type: z.enum(Object.keys(REPORTS), { error: 'Unknown report.' }) });
const optionalDate = (label) => z.string().refine(isValidIsoDate, `${label} must be a valid date.`).optional();
const query = z.object({ from: optionalDate('From'), to: optionalDate('To') }).transform(({ from, to }) => {
  const today = todayIST();
  return { from: from ?? `${today.slice(0, 7)}-01`, to: to ?? today }; // default: this month to date
});

router.get('/:type', validate({ params, query }), async (req, res) => {
  res.json({ success: true, data: await buildReport(req.valid.params.type, req.valid.query) });
});

router.get('/:type/export', validate({ params, query }), async (req, res) => {
  const report = await buildReport(req.valid.params.type, req.valid.query);
  const buffer = await reportToExcel(report, { businessName: getSettings().businessName });
  const range = report.period ? `${report.period.from}_to_${report.period.to}` : todayIST();
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="AgniDesk-${report.key}-${range}.xlsx"`,
    'Content-Length': buffer.length,
    'Cache-Control': 'private, no-store',
  });
  res.send(buffer);
});

export default router;
