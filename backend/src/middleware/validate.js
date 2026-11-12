import { ApiError } from '../utils/ApiError.js';

/**
 * Validates and normalises request parts with zod schemas.
 * Parsed values are placed on `req.valid = { body, query, params }`
 * (Express 5 makes req.query read-only, so we never overwrite it).
 *
 * Usage: router.post('/', validate({ body: customerSchema }), controller)
 */
export const validate = (schemas) => (req, _res, next) => {
  req.valid = req.valid ?? {};
  const details = [];

  for (const part of ['params', 'query', 'body']) {
    const schema = schemas[part];
    if (!schema) continue;
    const result = schema.safeParse(req[part] ?? {});
    if (result.success) {
      req.valid[part] = result.data;
    } else {
      for (const issue of result.error.issues) {
        details.push({ field: issue.path.join('.') || part, message: issue.message });
      }
    }
  }

  if (details.length > 0) {
    return next(new ApiError(400, 'Please correct the highlighted fields.', details));
  }
  return next();
};
