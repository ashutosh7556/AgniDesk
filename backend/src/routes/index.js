import { Router } from 'express';
import healthRoutes from './health.routes.js';

/** Mounts all API route modules under /api. Add new modules here per phase. */
const router = Router();

router.use('/health', healthRoutes);

export default router;
