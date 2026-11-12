import { env } from '../config/env.js';

/** Builds the health/status payload. Exposes no business or secret data. */
export const getHealthStatus = () => ({
  status: 'ok',
  service: 'agnidesk-api',
  environment: env.nodeEnv,
  uptimeSeconds: Math.round(process.uptime()),
  timestamp: new Date().toISOString(),
});
