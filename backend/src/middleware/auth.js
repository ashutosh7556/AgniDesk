import { authenticate } from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Requires a valid "Authorization: Bearer <JWT>" header for an account that
 * still exists and whose password hasn't changed since the token was issued.
 * On success sets req.auth = { userId, role }.
 */
export const requireAuth = async (req, _res, next) => {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Authentication required.'));
  }

  try {
    req.auth = await authenticate(token);
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Restricts a route to specific roles. Only 'owner' exists today; this is the
 * hook for employee accounts later, e.g. requireRole('owner', 'manager').
 */
export const requireRole =
  (...roles) =>
  (req, _res, next) => {
    if (!req.auth || !roles.includes(req.auth.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    return next();
  };
