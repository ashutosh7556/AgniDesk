import { z } from 'zod';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Indian GSTIN: 2-digit state code, PAN (10), entity code, 'Z', checksum. */
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

/** Text field that may be left empty; always stored as a trimmed string. */
export const optionalText = (max) => z.string().trim().max(max).optional().default('');

export const requiredText = (label, max) =>
  z.string({ error: `${label} is required.` }).trim().min(1, `${label} is required.`).max(max);

/** List query: ?search=&page=&limit= */
export const listQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(''),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const idParamSchema = (prefix) =>
  z.object({ id: z.string().regex(new RegExp(`^${prefix}-\\d{4,}$`), 'Invalid id.') });
