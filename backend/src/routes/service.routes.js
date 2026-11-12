import { Router } from 'express';
import { z } from 'zod';
import * as serviceRecords from '../services/serviceRecord.service.js';
import { certificateFileName, renderServiceCertificatePdf } from '../services/pdf/serviceCertificatePdf.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import { serviceListQuerySchema, serviceSchema } from '../validators/service.validator.js';
import { ApiError } from '../utils/ApiError.js';
import { sendPdf } from '../utils/sendPdf.js';

/**
 * Fire safety service records. Mounted behind requireAuth.
 * Handlers are thin wrappers around serviceRecord.service, so they live inline.
 */
const router = Router();
const params = idParamSchema('SRV');
const reminderQuery = z.object({ days: z.coerce.number().int().min(1).max(365).optional().default(30) });

router.get('/', validate({ query: serviceListQuerySchema }), async (req, res) => {
  res.json({ success: true, data: await serviceRecords.listServices(req.valid.query) });
});

router.get('/reminders', validate({ query: reminderQuery }), async (req, res) => {
  res.json({ success: true, data: await serviceRecords.listReminders({ windowDays: req.valid.query.days }) });
});

router.post('/', validate({ body: serviceSchema }), async (req, res) => {
  res.status(201).json({ success: true, data: await serviceRecords.createService(req.valid.body) });
});

router.get('/:id', validate({ params }), async (req, res) => {
  res.json({ success: true, data: await serviceRecords.getService(req.valid.params.id) });
});

router.put('/:id', validate({ params, body: serviceSchema }), async (req, res) => {
  res.json({ success: true, data: await serviceRecords.updateService(req.valid.params.id, req.valid.body) });
});

router.post('/:id/complete', validate({ params }), async (req, res) => {
  res.json({ success: true, data: await serviceRecords.completeService(req.valid.params.id) });
});

router.delete('/:id', validate({ params }), async (req, res) => {
  await serviceRecords.deleteService(req.valid.params.id);
  res.status(204).end();
});

router.get('/:id/certificate', validate({ params }), async (req, res) => {
  const service = await serviceRecords.getService(req.valid.params.id);
  if (service.status !== 'completed' || !service.certificateNumber) {
    throw new ApiError(409, 'A certificate is available only after the service is completed.');
  }
  sendPdf(res, await renderServiceCertificatePdf(service), certificateFileName(service));
});

export default router;
