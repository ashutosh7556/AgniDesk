import { Router } from 'express';
import * as invoiceController from '../controllers/invoice.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import { invoiceListQuerySchema, invoiceSchema, paymentSchema } from '../validators/document.validator.js';

/**
 * Mounted behind requireAuth in routes/index.js.
 * No DELETE route: invoices are cancelled, never deleted (continuous GST numbering).
 */
const router = Router();
const params = idParamSchema('IVC');

router.get('/', validate({ query: invoiceListQuerySchema }), invoiceController.list);
router.post('/', validate({ body: invoiceSchema }), invoiceController.create);
router.get('/:id', validate({ params }), invoiceController.getById);
router.get('/:id/pdf', validate({ params }), invoiceController.pdf);
router.put('/:id', validate({ params, body: invoiceSchema }), invoiceController.update);
router.post('/:id/cancel', validate({ params }), invoiceController.cancel);
router.get('/:id/payments', validate({ params }), invoiceController.listPayments);
router.post('/:id/payments', validate({ params, body: paymentSchema }), invoiceController.recordPayment);

export default router;
