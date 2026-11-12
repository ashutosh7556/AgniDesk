import { z } from 'zod';
import { listQuerySchema, requiredText } from './common.js';

export const PRODUCT_CATEGORIES = ['Fire Extinguisher', 'Hydrant', 'Safety', 'AMC & Service'];

const money = (label) =>
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

export const productSchema = z.object({
  name: requiredText('Product name', 150),
  category: z.enum(PRODUCT_CATEGORIES, { error: 'Select a valid category.' }),
  purchasePrice: money('Purchase price'),
  sellingPrice: money('Selling price'),
  quantity: wholeNumber('Quantity'),
  lowStockThreshold: wholeNumber('Low stock alert level'),
});

export const productListQuerySchema = listQuerySchema.extend({
  category: z.enum(PRODUCT_CATEGORIES).optional(),
  lowStock: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});
