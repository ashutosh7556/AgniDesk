import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import customerRoutes from './customer.routes.js';
import productRoutes from './product.routes.js';

/** Mounts all API route modules under /api. */
const router = Router();

// Public
router.use('/health', healthRoutes);
router.use('/auth', authRoutes); // /me is protected inside the module

// Protected: every business route requires a valid JWT
router.use('/customers', requireAuth, customerRoutes);
router.use('/products', requireAuth, productRoutes);

export default router;
