/**
 * Central error handler middleware.
 */
const errorHandler = (err, req, res, _next) => {
  console.error(err.stack);

  // Validation errors from express-validator are handled in controllers.
  // This catches unexpected/unhandled errors.
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500
    ? 'Lỗi máy chủ nội bộ'
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Create an app-level error with a status code.
 */
const createError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

module.exports = { errorHandler, createError };
