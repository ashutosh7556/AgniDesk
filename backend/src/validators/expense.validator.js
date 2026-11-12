import { z } from 'zod';
import { listQuerySchema, optionalText, requiredText } from './common.js';
import { money } from './product.validator.js';
import { EXPENSE_CATEGORIES } from '../config/business.js';
import { isValidIsoDate } from '../utils/dates.js';

const isoDate = (label) =>
  z.string({ error: `${label} is required.` }).refine(isValidIsoDate, `${label} must be a valid date.`);

export const expenseSchema = z.object({
  title: requiredText('Expense title', 150),
  category: z.enum(EXPENSE_CATEGORIES, { error: 'Select a category.' }),
  amount: money('Amount').refine((value) => value > 0, 'Amount must be more than 0.'),
  date: isoDate('Date'),
  description: optionalText(1000),
});

export const expenseListQuerySchema = listQuerySchema.extend({
  category: z.enum(EXPENSE_CATEGORIES).optional(),
  from: isoDate('From').optional(),
  to: isoDate('To').optional(),
});
