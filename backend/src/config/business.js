/**
 * DEFAULT seller profile. The live values are edited in Settings and read via
 * getBusinessProfile() (services/settings.service.js); these defaults (and the
 * BUSINESS_* env vars) are used only until the owner saves Settings.
 */
export const BUSINESS = Object.freeze({
  name: 'AGNI SETU FIRE SAFETY',
  tagline: 'Where Safety Meets Trust',
  email: 'agnisetufiresafety@gmail.com',
  phones: ['+91 9537728515', '+91 9712384126'],
  address: '404, Shree Laxmi Residency, Green Park, Karadva Gam, Dindoli, Surat.',
  gstin: (process.env.BUSINESS_GSTIN ?? '').trim().toUpperCase(),
  stateCode: (process.env.BUSINESS_STATE_CODE ?? '24').trim(), // 24 = Gujarat
  stateName: (process.env.BUSINESS_STATE_NAME ?? 'Gujarat').trim(),
});

/**
 * GST slabs offered in product and line-item forms.
 * Reflects the GST rate rationalisation effective 22 Sep 2025 (5% / 18% main
 * slabs, 40% special). Adjust here if your products need other rates.
 * Keep in sync with frontend/src/constants/business.js.
 */
export const GST_RATES = [0, 5, 18, 40];
export const DEFAULT_GST_RATE = 18;

export const DEFAULT_QUOTATION_TERMS = [
  'Prices are valid until the validity date mentioned above.',
  'GST as applicable will be charged extra unless shown in this quotation.',
  '50% advance with purchase order; balance on delivery/installation.',
  'Delivery within 7 working days from order confirmation, subject to stock availability.',
  'Warranty as per manufacturer terms.',
].join('\n');

export const EXPENSE_CATEGORIES = ['Product Purchases', 'Transportation', 'Installation', 'Maintenance', 'Other'];

export const PAYMENT_MODES = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Card'];

/** Based on the services offered on the visiting card. Keep in sync with the frontend. */
export const SERVICE_TYPES = [
  'Extinguisher Refilling',
  'Extinguisher Maintenance',
  'Extinguisher Installation',
  'Hydrant Flow & Pressure Test',
  'Smoke Alarm Inspection',
  'Fire & Evacuation Plan',
  'Fire Safety Audit / Advisory',
  'Fire NOC Assistance',
  'AMC Visit',
  'Other',
];

export const SERVICE_STATUSES = ['scheduled', 'completed', 'cancelled'];

/** Reminders show services due within this many days (plus overdue). */
export const REMINDER_WINDOW_DAYS = 30;

/** Document number prefixes. Numbers restart every financial year (Apr–Mar). */
export const NUMBER_PREFIX = Object.freeze({
  quotation: 'QT',
  gstInvoice: 'INV',
  nonGstInvoice: 'NG',
  certificate: 'CERT',
});
