import { Router } from 'express';
import * as paymentService from '../services/payment.service.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import { paymentListQuerySchema } from '../validators/document.validator.js';

/**
 * Mounted behind requireAuth. Payments are recorded via POST /api/invoices/:id/payments;
 * this module lists all payments and deletes (refunds/corrections).
 * Handlers are thin enough to live inline.
 */
const router = Router();

router.get('/', validate({ query: paymentListQuerySchema }), async (req, res) => {
  res.json({ success: true, data: await paymentService.listPayments(req.valid.query) });
});

router.delete('/:id', validate({ params: idParamSchema('PAY') }), async (req, res) => {
  await paymentService.deletePayment(req.valid.params.id);
  res.status(204).end();
});

export default router;
