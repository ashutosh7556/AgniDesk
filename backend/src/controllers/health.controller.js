import { getHealthStatus } from '../services/health.service.js';

export const healthCheck = (_req, res) => {
  res.status(200).json({ success: true, data: getHealthStatus() });
};
