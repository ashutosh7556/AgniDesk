import { Router } from 'express';
import * as quotationController from '../controllers/quotation.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import { documentListQuerySchema, quotationSchema } from '../validators/document.validator.js';

/** Mounted behind requireAuth in routes/index.js. */
const router = Router();
const params = idParamSchema('QTN');

router.get('/', validate({ query: documentListQuerySchema }), quotationController.list);
router.post('/', validate({ body: quotationSchema }), quotationController.create);
router.get('/:id', validate({ params }), quotationController.getById);
router.get('/:id/pdf', validate({ params }), quotationController.pdf);
router.put('/:id', validate({ params, body: quotationSchema }), quotationController.update);
router.delete('/:id', validate({ params }), quotationController.remove);

export default router;
