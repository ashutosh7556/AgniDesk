import { createApp } from './app.js';
import { env } from './config/env.js';
import { googleSheetsConfig } from './config/googleSheets.js';
import { ensureReady } from './bootstrap.js';

/** Long-running server (local development, or hosts like Render/Railway). Vercel uses api/index.js instead. */
async function start() {
  // Check Google Sheets tabs and the first owner account before accepting requests.
  await ensureReady();
  console.log(`[storage] Google Sheets spreadsheet: ${googleSheetsConfig.spreadsheetId.slice(0, 6)}… (all data)`);

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.log(`AgniDesk API running on http://localhost:${env.port} (${env.nodeEnv})`);
  });

  // Graceful shutdown: let in-flight requests (and their Google Sheets writes) finish.
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
