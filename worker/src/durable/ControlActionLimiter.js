import {
  CONTROL_DUPLICATE_COOLDOWN_MS,
  isDuplicateCooldown,
  isOverRateLimit,
  pruneTimestamps
} from '../lib/controlRateLimitLogic.js';

/**
 * Tracks per-user+IP control rate and duplicate action cooldown.
 */
export class ControlActionLimiter {
  /**
   * @param {DurableObjectState} state
   */
  constructor(state) {
    this.state = state;
  }

  async #loadState() {
    const stored = await this.state.storage.get('state');
    if (!stored || typeof stored !== 'object') {
      return { userTimestamps: [], ipTimestamps: [], lastByAction: {} };
    }
    const value = /** @type {{ userTimestamps?: number[], ipTimestamps?: number[], lastByAction?: Record<string, number> }} */ (
      stored
    );
    return {
      userTimestamps: Array.isArray(value.userTimestamps) ? value.userTimestamps : [],
      ipTimestamps: Array.isArray(value.ipTimestamps) ? value.ipTimestamps : [],
      lastByAction: value.lastByAction && typeof value.lastByAction === 'object' ? value.lastByAction : {}
    };
  }

  /**
   * @param {{ userTimestamps: number[], ipTimestamps: number[], lastByAction: Record<string, number> }} data
   */
  async #saveState(data) {
    await this.state.storage.put('state', data);
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname !== '/attempt' || request.method !== 'POST') {
      return new Response('Not found', { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ allowed: false, reason: 'BAD_REQUEST' }, { status: 400 });
    }

    const email = typeof body.email === 'string' ? body.email : '';
    const ip = typeof body.ip === 'string' ? body.ip : '';
    const buttonCode = typeof body.buttonCode === 'string' ? body.buttonCode : '';
    const now = typeof body.now === 'number' ? body.now : Date.now();

    if (!email || !ip || !buttonCode) {
      return Response.json({ allowed: false, reason: 'BAD_REQUEST' }, { status: 400 });
    }

    const state = await this.#loadState();
    const userTimestamps = pruneTimestamps(state.userTimestamps, now);
    const ipTimestamps = pruneTimestamps(state.ipTimestamps, now);
    const actionKey = `${email}:${buttonCode}`;
    const lastAt = state.lastByAction[actionKey];

    if (isDuplicateCooldown(lastAt, now)) {
      return Response.json({ allowed: false, reason: 'DUPLICATE_COOLDOWN' });
    }

    if (isOverRateLimit(userTimestamps, now) || isOverRateLimit(ipTimestamps, now)) {
      return Response.json({ allowed: false, reason: 'RATE_LIMITED' });
    }

    userTimestamps.push(now);
    ipTimestamps.push(now);
    state.lastByAction[actionKey] = now;
    await this.#saveState({
      userTimestamps,
      ipTimestamps,
      lastByAction: state.lastByAction
    });

    return Response.json({ allowed: true });
  }
}

export { CONTROL_DUPLICATE_COOLDOWN_MS };
