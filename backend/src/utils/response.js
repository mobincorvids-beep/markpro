/**
 * Standard API response shape.
 *
 * Matched against the cleanest existing controllers (controllers/seo/*,
 * controllers/docs/*), which already answer with
 *   { success: true,  data: ... }
 *   { success: false, message: ... }
 * so the React client (frontend/src/services/api.js) needs no changes.
 * `error` is mirrored alongside `message` because a handful of older SMM
 * screens read `error` - both are populated, nothing had to be renamed.
 */
function ok(res, data = null, status = 200, extra = {}) {
  return res.status(status).json({ success: true, data, ...extra });
}

function err(res, message = 'Request failed', status = 400, extra = {}) {
  const msg = message instanceof Error ? message.message : message;
  return res.status(status).json({ success: false, message: msg, error: msg, ...extra });
}

/** Wrap an async handler so nothing ever becomes an unhandled rejection. */
function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = { ok, err, asyncHandler };
