import express, { Router } from 'express';
import { createBackup, restoreBackup } from '../services/backup.service.js';
import { ApiError } from '../utils/ApiError.js';

/** Full backup download and restore. Mounted behind requireAuth (owner only). */
const router = Router();

router.get('/', async (_req, res) => {
  const { buffer, fileName } = await createBackup();
  res.set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': `attachment; filename="${fileName}"`,
    'Content-Length': buffer.length,
    'Cache-Control': 'private, no-store',
  });
  res.send(buffer);
});

/**
 * Body: the raw .xlsx file (Content-Type: application/octet-stream), max 25 MB.
 * Query: ?customers=false to keep the current Google Sheets customers untouched.
 */
router.post('/restore', express.raw({ type: 'application/octet-stream', limit: '25mb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new ApiError(400, 'Upload a backup file (.xlsx).');
  }
  const result = await restoreBackup(req.body, { includeCustomers: req.query.customers !== 'false' });
  res.json({ success: true, data: result });
});

export default router;
