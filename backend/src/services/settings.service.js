import { settingsStore } from '../storage/stores.js';
import { BUSINESS, DEFAULT_GST_RATE, DEFAULT_QUOTATION_TERMS } from '../config/business.js';

/**
 * Business settings (Settings page). Stored as key/value rows in settings.xlsx
 * and kept in memory, so PDFs and calculations can read them synchronously.
 * Defaults come from config/business.js (+ BUSINESS_* env vars) until saved.
 */

export const SETTINGS_DEFAULTS = Object.freeze({
  businessName: BUSINESS.name,
  tagline: BUSINESS.tagline,
  email: BUSINESS.email,
  phone1: BUSINESS.phones[0] ?? '',
  phone2: BUSINESS.phones[1] ?? '',
  address: BUSINESS.address,
  gstin: BUSINESS.gstin,
  stateCode: BUSINESS.stateCode,
  stateName: BUSINESS.stateName,
  defaultGstRate: String(DEFAULT_GST_RATE),
  quotationValidityDays: '15',
  defaultQuotationTerms: DEFAULT_QUOTATION_TERMS,
  defaultInvoiceNotes: '',
});

const NUMERIC_KEYS = new Set(['defaultGstRate', 'quotationValidityDays']);
let saved = {};

/** Typed settings object (numbers for numeric keys). */
export function getSettings() {
  const merged = { ...SETTINGS_DEFAULTS, ...saved };
  return Object.fromEntries(
    Object.entries(merged).map(([key, value]) => [key, NUMERIC_KEYS.has(key) ? Number(value) : value]),
  );
}

/** Seller details for PDFs and GST logic. */
export function getBusinessProfile() {
  const s = getSettings();
  return {
    name: s.businessName,
    tagline: s.tagline,
    email: s.email,
    phones: [s.phone1, s.phone2].filter(Boolean),
    address: s.address,
    gstin: s.gstin,
    stateCode: s.stateCode,
    stateName: s.stateName,
  };
}

/** Loads saved settings into memory. Called at startup (and after a restore). */
let loadedAt = 0;
const REFRESH_MS = 30_000;

export async function loadSettings() {
  const rows = await settingsStore.findAll();
  saved = Object.fromEntries(rows.filter((r) => r.key in SETTINGS_DEFAULTS).map((r) => [r.key, r.value]));
  loadedAt = Date.now();
  return getSettings();
}

/**
 * Re-reads settings at most every 30 s. On serverless hosts several server
 * copies run at once; this makes a change saved through one copy reach the others.
 */
export async function refreshSettingsIfStale() {
  if (Date.now() - loadedAt > REFRESH_MS) await loadSettings();
}

/** Saves the given keys (already validated), then refreshes the in-memory copy. */
export async function updateSettings(values) {
  const rows = await settingsStore.findAll();
  for (const [key, rawValue] of Object.entries(values)) {
    if (!(key in SETTINGS_DEFAULTS)) continue;
    const value = String(rawValue ?? '');
    const existing = rows.find((r) => r.key === key);
    if (existing) {
      if (existing.value !== value) await settingsStore.update(existing.id, { value });
    } else {
      await settingsStore.create({ key, value });
    }
  }
  return loadSettings();
}
