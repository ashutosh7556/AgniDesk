import { z } from 'zod';
import { EMAIL_PATTERN, GSTIN_PATTERN, optionalText, requiredText } from './common.js';

/**
 * Indian mobile number. Accepts "9876543210", "+91 98765 43210", "098765-43210"
 * and normalises to the 10-digit form.
 */
const mobileSchema = z
  .string({ error: 'Mobile number is required.' })
  .transform((value) => value.replace(/[\s-]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''))
  .refine((value) => /^[6-9]\d{9}$/.test(value), 'Enter a valid 10-digit Indian mobile number.');

export const customerSchema = z.object({
  name: requiredText('Customer name', 100),
  companyName: optionalText(150),
  mobile: mobileSchema,
  email: optionalText(150)
    .transform((value) => value.toLowerCase())
    .refine((value) => value === '' || EMAIL_PATTERN.test(value), 'Enter a valid email address.'),
  address: optionalText(500),
  gstNumber: optionalText(15)
    .transform((value) => value.toUpperCase())
    .refine((value) => value === '' || GSTIN_PATTERN.test(value), 'Enter a valid 15-character GSTIN.'),
});
