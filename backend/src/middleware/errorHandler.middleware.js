/**
 * Section B.8 - one terminal error handler.
 *
 * Every async route handler is wrapped by utils/wrapRouter, so a rejected
 * promise anywhere lands here instead of hanging the request or crashing the
 * process. Handlers that already have their own try/catch are unaffected.
 */
const logger = require('../utils/logger');

const STATUS_BY_NAME = {
  ValidationError: 422,   // mongoose schema validation
  CastError:       400,   // malformed ObjectId
  JsonWebTokenError: 401,
  TokenExpiredError: 401,
  MulterError:     400,
};

function notFound(req, res) {
  return res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(err, req, res, _next) {
  const status = err.statusCode || err.status || STATUS_BY_NAME[err.name]
    || (err.code === 11000 ? 409 : 500);   // duplicate key

  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Server error'                        // never leak internals to clients
    : (err.message || 'Server error');

  if (status >= 500) logger.error(`${req.method} ${req.originalUrl} → ${err.stack || err.message}`);
  else               logger.warn(`${req.method} ${req.originalUrl} → ${status} ${err.message}`);

  if (res.headersSent) return;
  return res.status(status).json({
    success: false,
    message,
    error: message,
    ...(status === 422 && err.errors ? { fields: Object.keys(err.errors) } : {}),
  });
}

module.exports = { notFound, errorHandler };
