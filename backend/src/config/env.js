/**
 * Centralised, validated environment configuration.
 * Values are loaded from backend/.env by Node's --env-file-if-exists flag
 * (see package.json scripts), so no dotenv dependency is needed.
 */

const parsePort = (value, fallback) => {
  const port = Number.parseInt(value ?? '', 10);
  return Number.isInteger(port) && port > 0 && port < 65536 ? port : fallback;
};

const parseList = (value) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const nodeEnv = process.env.NODE_ENV ?? 'development';

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsePort(process.env.PORT, 5000),
  corsOrigins: parseList(process.env.CORS_ORIGINS ?? 'http://localhost:5173'),
});
