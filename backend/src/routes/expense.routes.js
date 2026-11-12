import { Router } from 'express';
import * as expenseService from '../services/expense.service.js';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import { expenseListQuerySchema, expenseSchema } from '../validators/expense.validator.js';

/** Mounted behind requireAuth. Simple CRUD, so handlers live inline. */
const router = Router();
const params = idParamSchema('EXP');

router.get('/', validate({ query: expenseListQuerySchema }), async (req, res) => {
  res.json({ success: true, data: await expenseService.listExpenses(req.valid.query) });
});
router.post('/', validate({ body: expenseSchema }), async (req, res) => {
  res.status(201).json({ success: true, data: await expenseService.createExpense(req.valid.body) });
});
router.get('/:id', validate({ params }), async (req, res) => {
  res.json({ success: true, data: await expenseService.getExpense(req.valid.params.id) });
});
router.put('/:id', validate({ params, body: expenseSchema }), async (req, res) => {
  res.json({ success: true, data: await expenseService.updateExpense(req.valid.params.id, req.valid.body) });
});
router.delete('/:id', validate({ params }), async (req, res) => {
  await expenseService.deleteExpense(req.valid.params.id);
  res.status(204).end();
});

export default router;
