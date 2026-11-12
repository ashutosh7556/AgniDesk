import { rateLimit } from 'express-rate-limit';
import { ApiError } from '../utils/ApiError.js';

/** Slows down password guessing: 10 login attempts per 15 minutes per IP. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, _res, next) => {
    next(new ApiError(429, 'Too many login attempts. Please wait 15 minutes and try again.'));
  },
});
