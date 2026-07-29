import {
  isRateLimited,
  pruneFailures
} from '../lib/ownerAuthRateLimitLogic.js';

/**
 * Durable Object: tracks failed owner PIN attempts per client key across Worker isolates.
 */
export class OwnerAuthLimiter {
  /**
   * @param {DurableObjectState} state
   */
  constructor(state) {
    this.state = state;
  }

  async #loadFailures() {
    const stored = await this.state.storage.get('failures');
    return Array.isArray(stored) ? stored.filter((value) => typeof value === 'number') : [];
  }

  async #saveFailures(failures) {
    await this.state.storage.put('failures', failures);
  }

  async fetch(request) {
    const url = new URL(request.url);
    const now = Date.now();

    if (url.pathname === '/check' && request.method === 'GET') {
      const failures = await this.#loadFailures();
      const recent = pruneFailures(failures, now);
      await this.#saveFailures(recent);
      return Response.json({ allowed: !isRateLimited(recent, now) });
    }

    if (url.pathname === '/failure' && request.method === 'POST') {
      const failures = pruneFailures(await this.#loadFailures(), now);
      failures.push(now);
      await this.#saveFailures(failures);
      return Response.json({ allowed: !isRateLimited(failures, now) });
    }

    if (url.pathname === '/success' && request.method === 'POST') {
      await this.#saveFailures([]);
      return Response.json({ ok: true });
    }

    return new Response('Not found', { status: 404 });
  }
}
