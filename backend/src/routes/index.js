import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { readiness } from '../bootstrap.js';
import { getDashboard } from '../services/dashboard.service.js';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import customerRoutes from './customer.routes.js';
import productRoutes from './product.routes.js';
import quotationRoutes from './quotation.routes.js';
import invoiceRoutes from './invoice.routes.js';
import paymentRoutes from './payment.routes.js';
import expenseRoutes from './expense.routes.js';
import serviceRoutes from './service.routes.js';
import settingsRoutes from './settings.routes.js';
import reportRoutes from './report.routes.js';
import backupRoutes from './backup.routes.js';
import userRoutes from './user.routes.js';

/** Mounts all API route modules under /api. */
const router = Router();

// Public
router.use('/health', healthRoutes);

// Everything below needs Google Sheets: run startup checks (once) and keep settings fresh.
router.use(readiness);
router.use('/auth', authRoutes); // /me is protected inside the module

// Protected: every business route requires a valid JWT
router.use('/customers', requireAuth, customerRoutes);
router.use('/products', requireAuth, productRoutes);
router.use('/quotations', requireAuth, quotationRoutes);
router.use('/invoices', requireAuth, invoiceRoutes);
router.use('/payments', requireAuth, paymentRoutes);
router.use('/expenses', requireAuth, expenseRoutes);
router.use('/services', requireAuth, serviceRoutes);
router.use('/settings', requireAuth, settingsRoutes);
router.use('/reports', requireAuth, reportRoutes);
router.use('/backup', requireAuth, backupRoutes);
router.use('/users', requireAuth, userRoutes);
router.get('/dashboard', requireAuth, async (_req, res) => {
  res.json({ success: true, data: await getDashboard() });
});

export default router;
