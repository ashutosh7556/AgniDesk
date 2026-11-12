import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import { productListQuerySchema, productSchema } from '../validators/product.validator.js';

/** Mounted behind requireAuth in routes/index.js. */
const router = Router();
const params = idParamSchema('PRD');

router.get('/', validate({ query: productListQuerySchema }), productController.list);
router.post('/', validate({ body: productSchema }), productController.create);
router.get('/:id', validate({ params }), productController.getById);
router.put('/:id', validate({ params, body: productSchema }), productController.update);
router.delete('/:id', validate({ params }), productController.remove);

export default router;
