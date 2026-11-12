/**
 * Static business profile used across the UI.
 * Phase 6 (Settings) will move this into editable, persisted settings.
 */
export const BUSINESS = Object.freeze({
  name: 'AGNI SETU FIRE SAFETY',
  shortName: 'Agni Setu',
  appName: 'AgniDesk',
  tagline: 'Where Safety Meets Trust',
  email: 'agnisetufiresafety@gmail.com',
  phones: ['+91 9537728515', '+91 9712384126'],
  address: '404, Shree Laxmi Residency, Green Park, Karadva Gam, Dindoli, Surat.',
  services: [
    'Sales, services and maintenance of portable fire equipment',
    'Smoke alarm inspections in rental properties',
    'Hydrant flow and pressure testing',
    'Fire and evacuation plans',
    'Fire safety adviser',
    'Fire NOC assistance',
  ],
  categories: ['Fire Extinguisher', 'Hydrant', 'Safety', 'AMC & Service'],
});

/** Must match PRODUCT_CATEGORIES in backend/src/validators/product.validator.js. */
export const PRODUCT_CATEGORIES = BUSINESS.categories;

/** Must match EXPENSE_CATEGORIES / PAYMENT_MODES in backend/src/config/business.js. */
export const EXPENSE_CATEGORIES = ['Product Purchases', 'Transportation', 'Installation', 'Maintenance', 'Other'];
export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'];

/** Must match GST_RATES / DEFAULT_GST_RATE in backend/src/config/business.js. */
export const GST_RATES = [0, 5, 18, 40];
export const DEFAULT_GST_RATE = 18;

/**
 * Seller's GST state code, used to pre-select intra-state (CGST+SGST) vs
 * inter-state (IGST) from the customer's GSTIN. Must match BUSINESS_STATE_CODE
 * in backend/.env (24 = Gujarat). The user can always override per document.
 */
export const SELLER_STATE_CODE = '24';
