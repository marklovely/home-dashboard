import {
  isDuplicateCooldown,
  isOverRateLimit,
  pruneTimestamps
} from '../src/lib/controlRateLimitLogic.js';

/**
 * In-memory stub for CONTROL_ACTION_LIMITER durable object binding.
 */
export function createInMemoryControlLimiter() {
  /** @type {{ userTimestamps: number[], ipTimestamps: number[], lastByAction: Record<string, number> }} */
  const state = { userTimestamps: [], ipTimestamps: [], lastByAction: {} };

  return {
    idFromName() {
      return { name: 'test-control-limiter' };
    },
    get() {
      return {
        async fetch(input, init) {
          const urlString = typeof input === 'string' ? input : input.url;
          const url = new URL(urlString);
          const request = new Request(urlString, init);
          if (url.pathname !== '/attempt' || request.method !== 'POST') {
            return new Response('Not found', { status: 404 });
          }
          const body = await request.json();
          const email = typeof body.email === 'string' ? body.email : '';
          const buttonCode = typeof body.buttonCode === 'string' ? body.buttonCode : '';
          const now = typeof body.now === 'number' ? body.now : Date.now();
          const actionKey = `${email}:${buttonCode}`;
          const lastAt = state.lastByAction[actionKey];

          if (isDuplicateCooldown(lastAt, now)) {
            return Response.json({ allowed: false, reason: 'DUPLICATE_COOLDOWN' });
          }

          const userTimestamps = pruneTimestamps(state.userTimestamps, now);
          const ipTimestamps = pruneTimestamps(state.ipTimestamps, now);
          if (isOverRateLimit(userTimestamps, now) || isOverRateLimit(ipTimestamps, now)) {
            return Response.json({ allowed: false, reason: 'RATE_LIMITED' });
          }

          userTimestamps.push(now);
          ipTimestamps.push(now);
          state.userTimestamps = userTimestamps;
          state.ipTimestamps = ipTimestamps;
          state.lastByAction[actionKey] = now;
          return Response.json({ allowed: true });
        }
      };
    }
  };
}
