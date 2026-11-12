import { z } from 'zod';
import { EMAIL_PATTERN, GSTIN_PATTERN, optionalText, requiredText } from './common.js';
import { GST_RATES } from '../config/business.js';

export const settingsSchema = z
  .object({
    businessName: requiredText('Business name', 120),
    tagline: optionalText(120),
    email: optionalText(150).refine((v) => v === '' || EMAIL_PATTERN.test(v), 'Enter a valid email address.'),
    phone1: requiredText('Primary phone', 30),
    phone2: optionalText(30),
    address: requiredText('Address', 400),
    gstin: optionalText(15)
      .transform((v) => v.toUpperCase())
      .refine((v) => v === '' || GSTIN_PATTERN.test(v), 'Enter a valid 15-character GSTIN.'),
    stateCode: z.string({ error: 'State code is required.' }).trim().regex(/^\d{2}$/, 'State code must be 2 digits (e.g. 24 for Gujarat).'),
    stateName: requiredText('State name', 60),
    defaultGstRate: z.number({ error: 'Select a GST rate.' }).refine((v) => GST_RATES.includes(v), `GST rate must be one of ${GST_RATES.join(', ')}%.`),
    quotationValidityDays: z.number({ error: 'Enter a number of days.' }).int().min(1, 'At least 1 day.').max(365, 'At most 365 days.'),
    defaultQuotationTerms: optionalText(3000),
    defaultInvoiceNotes: optionalText(1000),
  })
  .refine((s) => !s.gstin || s.gstin.slice(0, 2) === s.stateCode, {
    path: ['stateCode'],
    message: 'State code must match the first 2 digits of your GSTIN.',
  });

export const profileSchema = z.object({
  name: requiredText('Name', 100),
  email: z.string({ error: 'Email is required.' }).trim().toLowerCase().regex(EMAIL_PATTERN, 'Enter a valid email address.'),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string({ error: 'Current password is required.' }).min(1, 'Current password is required.'),
    newPassword: z.string({ error: 'New password is required.' }).min(8, 'New password must be at least 8 characters.').max(200),
  })
  .refine((p) => p.newPassword !== p.currentPassword, { path: ['newPassword'], message: 'New password must be different.' });
