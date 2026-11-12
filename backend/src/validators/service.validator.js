import { z } from 'zod';
import { listQuerySchema, optionalText } from './common.js';
import { money } from './product.validator.js';
import { SERVICE_STATUSES, SERVICE_TYPES } from '../config/business.js';
import { isValidIsoDate } from '../utils/dates.js';

const isoDate = (label) =>
  z.string({ error: `${label} is required.` }).refine(isValidIsoDate, `${label} must be a valid date.`);

const optionalIsoDate = (label) =>
  z
    .string()
    .optional()
    .default('')
    .refine((value) => value === '' || isValidIsoDate(value), `${label} must be a valid date.`);

const equipmentItemSchema = z.object({
  name: z.string({ error: 'Equipment name is required.' }).trim().min(1, 'Equipment name is required.').max(150),
  quantity: z
    .number({ error: 'Quantity must be a number.' })
    .int('Quantity must be a whole number.')
    .min(1, 'Quantity must be at least 1.')
    .max(100_000),
  details: optionalText(300), // capacity, serial numbers, location...
});

export const serviceSchema = z
  .object({
    customerId: z.string({ error: 'Select a customer.' }).regex(/^CUS-\d{4,}$/, 'Select a customer.'),
    serviceType: z.enum(SERVICE_TYPES, { error: 'Select a service type.' }),
    status: z.enum(SERVICE_STATUSES, { error: 'Select a status.' }),
    serviceDate: isoDate('Service date'),
    nextDueDate: optionalIsoDate('Next due date'),
    charges: money('Charges').optional().default(0),
    technician: optionalText(100),
    siteAddress: optionalText(500),
    remarks: optionalText(2000),
    equipment: z.array(equipmentItemSchema).max(50, 'At most 50 equipment lines.').optional().default([]),
  })
  .refine((s) => !s.nextDueDate || s.nextDueDate > s.serviceDate, {
    path: ['nextDueDate'],
    message: 'Next due date must be after the service date.',
  });

export const serviceListQuerySchema = listQuerySchema.extend({
  customerId: z.string().regex(/^CUS-\d{4,}$/).optional(),
  status: z.enum(SERVICE_STATUSES).optional(),
  serviceType: z.enum(SERVICE_TYPES).optional(),
});
