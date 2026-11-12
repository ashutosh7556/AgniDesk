import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import {
  productCreateSchema,
  productListQuerySchema,
  productUpdateSchema,
  stockAdjustmentSchema,
} from '../validators/product.validator.js';

/** Mounted behind requireAuth in routes/index.js. */
const router = Router();
const params = idParamSchema('PRD');

router.get('/', validate({ query: productListQuerySchema }), productController.list);
router.post('/', validate({ body: productCreateSchema }), productController.create);
router.get('/:id', validate({ params }), productController.getById);
router.put('/:id', validate({ params, body: productUpdateSchema }), productController.update);
router.delete('/:id', validate({ params }), productController.remove);
router.get('/:id/stock', validate({ params }), productController.stockHistory);
router.post('/:id/stock', validate({ params, body: stockAdjustmentSchema }), productController.adjustStock);

export default router;
