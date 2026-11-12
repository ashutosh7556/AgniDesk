import fs from 'node:fs';
import path from 'node:path';
import { google } from 'googleapis';

/**
 * Google Sheets API connection (service account authentication).
 *
 * Configuration (backend/.env):
 *   GOOGLE_SHEETS_SPREADSHEET_ID     ID from the sheet URL: https://docs.google.com/spreadsheets/d/<ID>/edit
 *   GOOGLE_SERVICE_ACCOUNT_KEY_FILE  Path to the service account JSON key, relative to backend/
 *
 * Security:
 * - The key file lives outside src/ (backend/credentials/) and is git-ignored.
 * - The key is read only on the server; nothing here is ever sent to the frontend
 *   or written to logs (errors mention the file path, never its contents).
 * - Share the spreadsheet with the service account's client_email
 *   (Editor for read/write) — the service account has no access otherwise.
 *
 * The client is created lazily on first use, so the server still starts
 * (and every existing module keeps working) when Google Sheets is not configured.
 */

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets']; // read + write

const spreadsheetId = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? '').trim();
const keyFileSetting = (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE ?? '').trim();
// Relative paths are resolved from the backend folder (where npm scripts run).
const keyFile = keyFileSetting ? path.resolve(keyFileSetting) : '';

export const googleSheetsConfig = Object.freeze({
  spreadsheetId,
  keyFile,
  isConfigured: Boolean(spreadsheetId && keyFile),
});

export class GoogleSheetsConfigError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GoogleSheetsConfigError';
    this.statusCode = 503; // handled by the central error handler as "service unavailable"
  }
}

/** Reads and validates the service account key without exposing its contents. */
function loadServiceAccountCredentials() {
  if (!googleSheetsConfig.isConfigured) {
    throw new GoogleSheetsConfigError(
      'Google Sheets is not configured. Set GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_KEY_FILE in backend/.env.',
    );
  }
  if (!fs.existsSync(keyFile)) {
    throw new GoogleSheetsConfigError(`Google service account key file not found at: ${keyFile}`);
  }

  let credentials;
  try {
    credentials = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  } catch {
    throw new GoogleSheetsConfigError('Google service account key file is not valid JSON.');
  }

  if (credentials.type !== 'service_account' || !credentials.client_email || !credentials.private_key) {
    throw new GoogleSheetsConfigError(
      'Google key file is not a service account key (expected "type": "service_account", client_email and private_key).',
    );
  }
  return credentials;
}

let sheetsClient = null;

/**
 * Returns an authenticated Google Sheets v4 client (created once, then reused).
 * Throws GoogleSheetsConfigError when configuration or the key file is missing/invalid.
 */
export function getSheetsClient() {
  if (!sheetsClient) {
    const credentials = loadServiceAccountCredentials();
    // JWT is the dedicated service-account client. (Passing `credentials` to
    // GoogleAuth is deprecated in google-auth-library v10+ and prints a warning.)
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: SCOPES,
    });
    sheetsClient = google.sheets({ version: 'v4', auth });
  }
  return sheetsClient;
}

/** The service account email the spreadsheet must be shared with (safe to display). */
export function getServiceAccountEmail() {
  return loadServiceAccountCredentials().client_email;
}

/**
 * Checks that authentication works and the spreadsheet is accessible.
 * @returns {Promise<{ title: string, sheets: string[] }>}
 */
export async function verifyGoogleSheetsConnection() {
  const sheets = getSheetsClient();
  try {
    const { data } = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'properties.title,sheets.properties.title',
    });
    return {
      title: data.properties?.title ?? '',
      sheets: (data.sheets ?? []).map((sheet) => sheet.properties?.title ?? ''),
    };
  } catch (error) {
    const status = error.code ?? error.response?.status;
    if (status === 403) {
      throw new GoogleSheetsConfigError(
        `Access denied. Share the spreadsheet with the service account email (${getServiceAccountEmail()}) and make sure the Google Sheets API is enabled.`,
      );
    }
    if (status === 404) {
      throw new GoogleSheetsConfigError('Spreadsheet not found. Check GOOGLE_SHEETS_SPREADSHEET_ID in backend/.env.');
    }
    throw error;
  }
}
