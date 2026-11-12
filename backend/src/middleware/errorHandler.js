import { env } from '../config/env.js';

/**
 * Central error handler. Always responds with a consistent JSON shape:
 *   { success: false, error: { message, details? } }
 * Internal error details and stack traces are never leaked in production.
 */
// Express identifies error handlers by their 4-argument signature.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  // Malformed JSON body from express.json()
  const isJsonSyntaxError = err.type === 'entity.parse.failed';
  const statusCode = isJsonSyntaxError ? 400 : err.statusCode ?? err.status ?? 500;
  const isServerError = statusCode >= 500;

  if (isServerError) {
    console.error('[error]', err);
  }

  let message = err.message;
  if (isJsonSyntaxError) message = 'Malformed JSON in request body';
  else if (isServerError && env.isProduction) message = 'Internal server error';

  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(err.details ? { details: err.details } : {}),
      ...(!env.isProduction && isServerError ? { stack: err.stack } : {}),
    },
  });
};
