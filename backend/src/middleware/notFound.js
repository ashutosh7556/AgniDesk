import { ApiError } from '../utils/ApiError.js';

/** Converts any unmatched route into a 404 handled by errorHandler. */
export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};
