import { Router } from 'express';
import * as customerController from '../controllers/customer.controller.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema, listQuerySchema } from '../validators/common.js';
import { customerSchema } from '../validators/customer.validator.js';

/** Mounted behind requireAuth in routes/index.js. */
const router = Router();
const params = idParamSchema('CUS');

router.get('/', validate({ query: listQuerySchema }), customerController.list);
router.post('/', validate({ body: customerSchema }), customerController.create);
router.get('/:id', validate({ params }), customerController.getById);
router.put('/:id', validate({ params, body: customerSchema }), customerController.update);
router.delete('/:id', validate({ params }), customerController.remove);

export default router;
