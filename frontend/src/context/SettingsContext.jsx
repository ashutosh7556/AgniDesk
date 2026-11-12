import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getSettings } from '../services/settingsService.js';
import { BUSINESS, DEFAULT_GST_RATE, SELLER_STATE_CODE } from '../constants/business.js';

/**
 * Business settings for the logged-in app (forms, WhatsApp messages...).
 * Until the server responds, built-in defaults are used so nothing breaks.
 */
const FALLBACK = {
  businessName: BUSINESS.name,
  tagline: BUSINESS.tagline,
  email: BUSINESS.email,
  phone1: BUSINESS.phones[0],
  phone2: BUSINESS.phones[1] ?? '',
  address: BUSINESS.address,
  gstin: '',
  stateCode: SELLER_STATE_CODE,
  stateName: 'Gujarat',
  defaultGstRate: DEFAULT_GST_RATE,
  quotationValidityDays: 15,
  defaultQuotationTerms: '',
  defaultInvoiceNotes: '',
};

export const SettingsContext = createContext({ settings: FALLBACK, isLoaded: true, setSettings: () => {}, reload: () => {} });

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(FALLBACK);
  const [reloadKey, setReloadKey] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getSettings(controller.signal)
      .then((data) => setSettings({ ...FALLBACK, ...data.settings }))
      .catch(() => {}) // keep fallback; pages show their own errors for API problems
      .finally(() => !controller.signal.aborted && setIsLoaded(true));
    return () => controller.abort();
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  const value = useMemo(() => ({ settings, isLoaded, setSettings: (s) => setSettings({ ...FALLBACK, ...s }), reload }), [settings, isLoaded, reload]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}
