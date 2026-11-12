import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { settingsSchema } from '../validators/settings.validator.js';
import { getSettings, updateSettings } from '../services/settings.service.js';
import { GST_RATES } from '../config/business.js';

/** Business settings. Mounted behind requireAuth. */
const router = Router();

router.get('/', (_req, res) => {
  res.json({ success: true, data: { settings: getSettings(), options: { gstRates: GST_RATES } } });
});

router.put('/', validate({ body: settingsSchema }), async (req, res) => {
  res.json({ success: true, data: { settings: await updateSettings(req.valid.body), options: { gstRates: GST_RATES } } });
});

export default router;
