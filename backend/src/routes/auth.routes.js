import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { loginLimiter } from '../middleware/rateLimiters.js';
import { loginSchema } from '../validators/auth.validator.js';

const router = Router();

router.post('/login', loginLimiter, validate({ body: loginSchema }), authController.login);
router.get('/me', requireAuth, authController.me);

export default router;
