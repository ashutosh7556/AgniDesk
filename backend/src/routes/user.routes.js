import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { idParamSchema } from '../validators/common.js';
import { profileSchema } from '../validators/settings.validator.js';
import * as userService from '../services/user.service.js';

/** Admin accounts (Settings > Users). Mounted behind requireAuth. */
const router = Router();
const params = idParamSchema('USR');
const passwordField = z.string({ error: 'Password is required.' }).min(8, 'Password must be at least 8 characters.').max(200);
const createSchema = profileSchema.extend({ password: passwordField });
const resetSchema = z.object({ password: passwordField });

router.get('/', async (_req, res) => {
  res.json({ success: true, data: await userService.listUsers() });
});

router.post('/', validate({ body: createSchema }), async (req, res) => {
  res.status(201).json({ success: true, data: { user: await userService.createUser(req.valid.body) } });
});

router.put('/:id/password', validate({ params, body: resetSchema }), async (req, res) => {
  await userService.resetUserPassword(req.auth.userId, req.valid.params.id, req.valid.body);
  res.json({ success: true, data: { message: 'Password reset.' } });
});

router.delete('/:id', validate({ params }), async (req, res) => {
  await userService.deleteUser(req.auth.userId, req.valid.params.id);
  res.status(204).end();
});

export default router;
