import { lazy } from 'react';

/**
 * React.lazy with automatic recovery from ChunkLoadError.
 *
 * A ChunkLoadError happens when the browser still holds an old build's chunk
 * map (after a redeploy) or when a single chunk request fails on a flaky
 * network. Instead of crashing the whole page we:
 *   1. retry the dynamic import a couple of times with a short backoff, and
 *   2. reload the page exactly once if the chunk is still unreachable.
 *
 * The one-shot reload flag lives in sessionStorage so we can never end up in
 * an infinite reload loop.
 */
const RELOAD_FLAG = 'chunk-reload-attempted';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const isChunkError = (err) => {
  const msg = String((err && (err.message || err.name)) || '');
  return (
    /ChunkLoadError/i.test(msg) ||
    /Loading chunk .* failed/i.test(msg) ||
    /Loading CSS chunk .* failed/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg)
  );
};

export function retryImport(factory, retries = 2, delay = 400) {
  return new Promise((resolve, reject) => {
    factory()
      .then((mod) => {
        try {
          window.sessionStorage.removeItem(RELOAD_FLAG);
        } catch (_) {
          /* storage unavailable — non fatal */
        }
        resolve(mod);
      })
      .catch(async (err) => {
        if (retries > 0) {
          await sleep(delay);
          retryImport(factory, retries - 1, delay * 2).then(resolve, reject);
          return;
        }

        if (isChunkError(err)) {
          let alreadyReloaded = false;
          try {
            alreadyReloaded = window.sessionStorage.getItem(RELOAD_FLAG) === '1';
            if (!alreadyReloaded) window.sessionStorage.setItem(RELOAD_FLAG, '1');
          } catch (_) {
            /* storage unavailable — fall through to reject */
          }
          if (!alreadyReloaded) {
            window.location.reload();
            return;
          }
        }
        reject(err);
      });
  });
}

export default function lazyRetry(factory) {
  return lazy(() => retryImport(factory));
}
