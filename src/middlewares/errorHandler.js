function errorHandler(error, request, response, next) {
  const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error.message;

  response.status(statusCode).json({ success: false, message });
}

module.exports = errorHandler;
