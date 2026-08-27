const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { jwtSecret } = require('../config/env');

async function protect(request, response, next) {
  try {
    const header = request.headers.authorization || '';
    if (!header.startsWith('Bearer ')) throw new AppError('Authentication required', 401);
    const payload = jwt.verify(header.slice(7), jwtSecret);
    request.user = await User.findById(payload.id).select('-password');
    if (!request.user || !request.user.isActive) throw new AppError('User is not available', 401);
    next();
  } catch (error) {
    next(error.statusCode ? error : new AppError('Invalid or expired token', 401));
  }
}

function authorize(...roles) {
  return (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) return next(new AppError('Insufficient permissions', 403));
    next();
  };
}

module.exports = { protect, authorize };
