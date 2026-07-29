import { isRateLimited, pruneFailures } from '../src/lib/ownerAuthRateLimitLogic.js';

/**
 * In-memory Durable Object stand-in for unit tests only.
 */
export function createTestOwnerAuthLimiter() {
  /** @type {Map<string, number[]>} */
  const failuresById = new Map();

  return {
    idFromName(/** @type {string} */ name) {
      return { name, toString: () => name };
    },
    get(/** @type {{ name: string }} */ id) {
      const key = id.name;
      return {
        async fetch(/** @type {string} */ url) {
          const path = new URL(url).pathname;
          const now = Date.now();
          let failures = pruneFailures(failuresById.get(key) ?? [], now);

          if (path === '/check') {
            failuresById.set(key, failures);
            return Response.json({ allowed: !isRateLimited(failures, now) });
          }
          if (path === '/failure') {
            failures.push(now);
            failuresById.set(key, failures);
            return Response.json({ allowed: !isRateLimited(failures, now) });
          }
          if (path === '/success') {
            failuresById.set(key, []);
            return Response.json({ ok: true });
          }
          return new Response('Not found', { status: 404 });
        }
      };
    }
  };
}
