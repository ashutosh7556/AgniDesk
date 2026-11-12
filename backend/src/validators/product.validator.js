import { z } from 'zod';
import { listQuerySchema, requiredText } from './common.js';
import { DEFAULT_GST_RATE, GST_RATES } from '../config/business.js';
import { isValidIsoDate } from '../utils/dates.js';

export const PRODUCT_CATEGORIES = ['Fire Extinguisher', 'Hydrant', 'Safety', 'AMC & Service'];

export const money = (label) =>
  z
    .number({ error: `${label} must be a number.` })
    .min(0, `${label} cannot be negative.`)
    .max(10_000_000, `${label} is too large.`)
    .transform((value) => Math.round(value * 100) / 100); // paise precision

const wholeNumber = (label) =>
  z
    .number({ error: `${label} must be a number.` })
    .int(`${label} must be a whole number.`)
    .min(0, `${label} cannot be negative.`)
    .max(1_000_000, `${label} is too large.`);

/** HSN (goods) / SAC (services) code: 4–8 digits, optional. */
export const hsnSchema = z
  .string()
  .trim()
  .optional()
  .default('')
  .refine((value) => value === '' || /^\d{4,8}$/.test(value), 'HSN/SAC code must be 4 to 8 digits.');

export const gstRateSchema = z
  .number({ error: 'Select a GST rate.' })
  .refine((value) => GST_RATES.includes(value), `GST rate must be one of ${GST_RATES.join(', ')}%.`);

/**
 * Update: product details only. Stock is never edited directly — it changes
 * through invoices and stock adjustments so every change has a trail.
 */
export const productUpdateSchema = z.object({
  name: requiredText('Product name', 150),
  category: z.enum(PRODUCT_CATEGORIES, { error: 'Select a valid category.' }),
  purchasePrice: money('Purchase price'),
  sellingPrice: money('Selling price'),
  lowStockThreshold: wholeNumber('Low stock alert level'),
  hsnCode: hsnSchema,
  gstRate: gstRateSchema.optional().default(DEFAULT_GST_RATE),
});

/** Create: details + opening stock (set once). */
export const productCreateSchema = productUpdateSchema.extend({
  openingStock: wholeNumber('Opening stock'),
});

export const stockAdjustmentSchema = z.object({
  date: z.string({ error: 'Date is required.' }).refine(isValidIsoDate, 'Date must be a valid date.'),
  type: z.enum(['purchase', 'adjustment'], { error: 'Choose purchase or adjustment.' }),
  quantity: z
    .number({ error: 'Quantity must be a number.' })
    .int('Quantity must be a whole number.')
    .min(-1_000_000)
    .max(1_000_000)
    .refine((value) => value !== 0, 'Quantity cannot be 0.'),
  note: z.string().trim().max(300).optional().default(''),
}).refine((data) => data.type !== 'purchase' || data.quantity > 0, {
  path: ['quantity'],
  message: 'Purchased quantity must be more than 0.',
});

export const productListQuerySchema = listQuerySchema.extend({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
