const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function validate(request, response, next) {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array().map((error) => error.msg).join(', '), 400));
  }
  return next();
}

module.exports = validate;
