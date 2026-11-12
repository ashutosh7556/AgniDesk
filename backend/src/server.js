import { createApp } from './app.js';
import { env } from './config/env.js';
import { initStores } from './storage/stores.js';
import { ensureOwnerAccount } from './services/auth.service.js';
import { loadSettings } from './services/settings.service.js';

async function start() {
  // Create the data folder / workbooks and the first owner account before accepting requests.
  await initStores();
  await ensureOwnerAccount();
  await loadSettings();
  console.log(`[storage] Excel data folder: ${env.dataDir}`);

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`AgniDesk API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown: let in-flight requests (and their Excel writes) finish.
  const shutdown = (signal) => {
    console.log(`${signal} received, shutting down...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((error) => {
  console.error('[startup] Failed to start server:', error);
  process.exit(1);
});
