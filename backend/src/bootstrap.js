import { initStores } from './storage/stores.js';
import { ensureOwnerAccount } from './services/auth.service.js';
import { loadSettings, refreshSettingsIfStale } from './services/settings.service.js';
import { syncAllSheetsNow } from './services/sheetSync.service.js';

/**
 * One-time startup work (per server process / serverless instance):
 * check/create Google Sheets tabs and columns, create the first owner if
 * the Users tab is empty, load settings, refresh display columns.
 *
 * Shared by the long-running server (src/server.js) and the Vercel function
 * (api/index.js). If it fails (e.g. Google unreachable) the next request retries.
 */
let readyPromise = null;

export function ensureReady() {
  if (!readyPromise) {
    readyPromise = (async () => {
      await initStores();
      await ensureOwnerAccount();
      await loadSettings();
      syncAllSheetsNow().catch(() => {}); // display columns, in the background
    })().catch((error) => {
      readyPromise = null; // allow a retry on the next request
      throw error;
    });
  }
  return readyPromise;
}

/** Express middleware: startup done + settings fresh before handling business routes. */
export async function readiness(_req, _res, next) {
  try {
    await ensureReady();
    await refreshSettingsIfStale();
    next();
  } catch (error) {
    next(error);
  }
}
