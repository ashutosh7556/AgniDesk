import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiters.js';
import { loginSchema } from '../validators/auth.validator.js';
import { passwordSchema, profileSchema } from '../validators/settings.validator.js';
import * as authService from '../services/auth.service.js';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginSchema }), authController.login);
router.get('/me', requireAuth, authController.me);

router.put('/profile', requireAuth, validate({ body: profileSchema }), async (req, res) => {
  res.json({ success: true, data: { user: await authService.updateProfile(req.auth.userId, req.valid.body) } });
});

router.put('/password', requireAuth, validate({ body: passwordSchema }), async (req, res) => {
  const { token } = await authService.changePassword(req.auth.userId, req.valid.body);
  res.json({ success: true, data: { message: 'Password changed.', token } });
});

export default router;
