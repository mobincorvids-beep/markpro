/**
 * Section B.7 - one API response shape, enforced in one place.
 *
 * The merged codebase answered in three different dialects:
 *   A) { success: true, data }              - seo/, docs/, newer routes
 *   B) { status: 'success', data, total }   - socialai/, biolinks/  (20 files)
 *   C) a bare payload: [...] or { user }    - assorted older handlers
 *
 * Rewriting 210 controllers would mean touching every React screen that reads
 * them. Instead this middleware normalises on the way out, so every response
 * from every module now satisfies:
 *
 *   success:    boolean  - derived from the status code (or an explicit flag)
 *   data:       payload  - present on success
 *   message:    string   - present on failure
 *   error:      string   - mirrors message (older SMM screens read `error`)
 *
 * It is ADDITIVE: original top-level keys are preserved alongside the
 * standard ones, so existing frontend code that reads `res.data.orders` or
 * `res.data.total` keeps working while new code can rely on the contract.
 */
const LEGACY_OK = new Set(['success', 'ok']);

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v) && !Buffer.isBuffer(v);
}

module.exports = function envelope(req, res, next) {
  // Never touch non-API traffic (static files, the React shell, health checks).
  if (!req.path.startsWith('/api')) return next();

  const json = res.json.bind(res);

  res.json = (body) => {
    const code = res.statusCode || 200;

    // Arrays / primitives (dialect C): wrap them.
    if (!isPlainObject(body)) {
      return json(code < 400
        ? { success: true, data: body === undefined ? null : body }
        : { success: false, message: String(body ?? 'Request failed'), error: String(body ?? 'Request failed') });
    }

    // Explicit success flag (dialect A) or legacy status string (dialect B).
    let success;
    if (typeof body.success === 'boolean')      success = body.success;
    else if (typeof body.status === 'string')   success = LEGACY_OK.has(body.status);
    else                                        success = code < 400;

    if (success) {
      const data = 'data' in body
        ? body.data
        // Nothing named `data`: expose the payload minus bookkeeping keys.
        : (() => {
            const { success: _s, status: _st, message: _m, error: _e, ...rest } = body;
            return Object.keys(rest).length ? rest : null;
          })();
      return json({ success: true, data, ...body });
    }

    const message = body.message || body.error || 'Request failed';
    if (code < 400) res.status(400);
    return json({ success: false, message, error: message, ...body });
  };

  next();
};
