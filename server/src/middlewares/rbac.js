import ApiError from '../utils/ApiError.js';

// Usage: router.get('/x', protect, authorize(ROLES.ADMIN, ROLES.DOCTOR), controller)
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized('Please login to continue'));
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission to do this'));
  }
  next();
};

export default authorize;