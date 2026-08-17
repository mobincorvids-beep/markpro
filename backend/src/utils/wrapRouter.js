/**
 * Section B.8 - guarantees consistent error handling without editing 210 files.
 *
 * Walks a mounted Express router and wraps every handler so a thrown error or
 * a rejected promise is forwarded to next(err) and handled by
 * middleware/errorHandler. Handlers with their own try/catch keep working
 * exactly as before - this only catches what would otherwise escape.
 */
function wrapHandler(fn) {
  if (typeof fn !== 'function' || fn.__wrapped) return fn;

  // Error-handling middleware keeps its 4-arg signature.
  if (fn.length === 4) {
    const wrapped = function (err, req, res, next) {
      try { return Promise.resolve(fn(err, req, res, next)).catch(next); }
      catch (e) { return next(e); }
    };
    wrapped.__wrapped = true;
    return wrapped;
  }

  const wrapped = function (req, res, next) {
    try { return Promise.resolve(fn(req, res, next)).catch(next); }
    catch (e) { return next(e); }
  };
  wrapped.__wrapped = true;
  return wrapped;
}

function wrapRouter(router) {
  const stack = router?.stack;
  if (!Array.isArray(stack)) return router;

  for (const layer of stack) {
    if (layer.route) {
      for (const routeLayer of layer.route.stack) {
        routeLayer.handle = wrapHandler(routeLayer.handle);
      }
    } else if (layer.handle?.stack) {
      wrapRouter(layer.handle);            // nested router
    } else if (typeof layer.handle === 'function') {
      layer.handle = wrapHandler(layer.handle);
    }
  }
  return router;
}

module.exports = { wrapRouter, wrapHandler };
