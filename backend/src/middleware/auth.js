import { verifyToken } from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Requires a valid "Authorization: Bearer <JWT>" header.
 * On success sets req.auth = { userId, role }.
 */
export const requireAuth = (req, _res, next) => {
  const header = req.get('authorization') ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Authentication required.'));
  }

  req.auth = verifyToken(token); // throws ApiError(401) when invalid/expired
  return next();
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
