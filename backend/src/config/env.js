import path from 'node:path';

/**
 * Centralised, validated environment configuration.
 * Values are loaded from backend/.env by Node's --env-file-if-exists flag
 * (see package.json scripts), so no dotenv dependency is needed.
 * Missing critical values stop the server at startup with a clear message.
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

const fail = (message) => {
  console.error(`\n[config] ${message}\nSee backend/.env.example.\n`);
  process.exit(1);
};

const nodeEnv = process.env.NODE_ENV ?? 'development';

const jwtSecret = process.env.JWT_SECRET ?? '';
if (jwtSecret.length < 32) {
  fail('JWT_SECRET is missing or shorter than 32 characters.');
}

export const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: parsePort(process.env.PORT, 5000),
  corsOrigins: parseList(process.env.CORS_ORIGINS ?? 'http://localhost:5173'),

  // Resolved relative to the backend folder (where npm scripts run).
  dataDir: path.resolve(process.env.DATA_DIR || './data'),

  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',

  owner: Object.freeze({
    name: process.env.OWNER_NAME || 'Business Owner',
    email: (process.env.OWNER_EMAIL ?? '').trim().toLowerCase(),
    password: process.env.OWNER_PASSWORD ?? '',
  }),
});
