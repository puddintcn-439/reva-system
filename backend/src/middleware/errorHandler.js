const logger = require('../config/logger')

/**
 * Central error handler middleware.
 */
const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500

  // Structured log — req.log is pino-http's per-request logger (has requestId)
  const log = req.log || logger
  if (statusCode >= 500) {
    log.error({
      err: { message: err.message, stack: err.stack },
      method: req.method,
      url: req.url,
      userId: req.user?.id || null,
    }, 'Unhandled server error')
    // Report to Sentry when DSN configured
    if (process.env.SENTRY_DSN) {
      try {
        const Sentry = require('@sentry/node')
        Sentry.captureException(err, {
          user: req.user ? { id: req.user.id, username: req.user.username } : undefined,
          extra: { method: req.method, url: req.url },
        })
      } catch { /* Sentry not initialised */ }
    }
  } else {
    log.warn({
      err: { message: err.message },
      method: req.method,
      url: req.url,
      statusCode,
    }, 'Request error')
  }

  const message = statusCode === 500 ? 'Lỗi máy chủ nội bộ' : err.message

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
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
