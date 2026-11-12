import { z } from 'zod';
import { EMAIL_PATTERN } from './common.js';

export const loginSchema = z.object({
  email: z
    .string({ error: 'Email is required.' })
    .trim()
    .toLowerCase()
    .regex(EMAIL_PATTERN, 'Enter a valid email address.'),
  password: z.string({ error: 'Password is required.' }).min(1, 'Password is required.').max(200),
});
