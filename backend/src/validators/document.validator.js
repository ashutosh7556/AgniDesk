import { z } from 'zod';
import { listQuerySchema, optionalText } from './common.js';
import { gstRateSchema, hsnSchema, money } from './product.validator.js';
import { DEFAULT_GST_RATE } from '../config/business.js';
import { isValidIsoDate } from '../utils/dates.js';

const isoDate = (label) =>
  z.string({ error: `${label} is required.` }).refine(isValidIsoDate, `${label} must be a valid date.`);

const lineItemSchema = z.object({
  productId: z
    .string()
    .optional()
    .default('')
    .refine((value) => value === '' || /^PRD-\d{4,}$/.test(value), 'Invalid product.'),
  description: z.string({ error: 'Description is required.' }).trim().min(1, 'Description is required.').max(300),
  hsnCode: hsnSchema,
  quantity: z
    .number({ error: 'Quantity must be a number.' })
    .positive('Quantity must be more than 0.')
    .max(1_000_000, 'Quantity is too large.')
    .transform((value) => Math.round(value * 1000) / 1000),
  rate: money('Rate'),
  discountPercent: z
    .number({ error: 'Discount must be a number.' })
    .min(0, 'Discount cannot be negative.')
    .max(100, 'Discount cannot exceed 100%.')
    .optional()
    .default(0),
  gstRate: gstRateSchema.optional().default(DEFAULT_GST_RATE),
});

const baseDocumentFields = {
  customerId: z.string({ error: 'Select a customer.' }).regex(/^CUS-\d{4,}$/, 'Select a customer.'),
  date: isoDate('Date'),
  // Omit to auto-detect from the customer's GSTIN state code.
  supplyType: z.enum(['intra', 'inter']).optional(),
  items: z
    .array(lineItemSchema, { error: 'Add at least one item.' })
    .min(1, 'Add at least one item.')
    .max(50, 'A document can have at most 50 items.'),
  notes: optionalText(1000),
};

export const quotationSchema = z
  .object({
    ...baseDocumentFields,
    taxMode: z.enum(['gst', 'none'], { error: 'Choose whether to include GST.' }),
    validUntil: isoDate('Valid until'),
    terms: optionalText(3000),
  })
  .refine((q) => q.validUntil >= q.date, {
    path: ['validUntil'],
    message: 'Validity date cannot be before the quotation date.',
  });

export const invoiceSchema = z.object({
  ...baseDocumentFields,
  invoiceType: z.enum(['gst', 'non-gst'], { error: 'Choose GST or Non-GST invoice.' }),
  amountPaid: money('Amount paid').optional().default(0),
});

export const paymentSchema = z.object({
  amountPaid: money('Amount paid'),
});

export const documentListQuerySchema = listQuerySchema.extend({
  customerId: z.string().regex(/^CUS-\d{4,}$/).optional(),
});

export const invoiceListQuerySchema = documentListQuerySchema.extend({
  invoiceType: z.enum(['gst', 'non-gst']).optional(),
  paymentStatus: z.enum(['paid', 'partial', 'unpaid', 'cancelled']).optional(),
});
