import { describe, expect, it } from 'vitest';
import {
  consumeSignupAttempt,
  getActiveSignupReservation,
  hashSignupClientKey,
  releaseSignupReservation,
  reserveSignupSlug,
  signupClientIp,
  signupRateLimitDecision,
  SIGNUP_RATE_LIMIT_MAX,
  SIGNUP_RATE_LIMIT_WINDOW_MS,
  SIGNUP_RESERVATION_TTL_MS
} from '../functions/api/platform/platformSignupGuards.js';
import {
  turnstileConfigured,
  turnstileSiteKey,
  turnstileVerdict,
  verifyTurnstileToken
} from '../functions/api/platform/platformSignupTurnstile.js';

/**
 * Minimal in-memory stand-in for the two D1 tables the guards use.
 */
function fakeBillingDb() {
  /** @type {Map<string, { attempts: number }>} */
  const attempts = new Map();
  /** @type {Map<string, Record<string, unknown>>} */
  const reservations = new Map();

  return {
    attempts,
    reservations,
    prepare(sql) {
      /** @type {unknown[]} */
      let args = [];
      const api = {
        bind(...values) {
          args = values;
          return api;
        },
        async run() {
          if (sql.includes('INSERT INTO signup_attempts')) {
            const key = `${args[0]}::${args[1]}`;
            const row = attempts.get(key) ?? { attempts: 0 };
            row.attempts += 1;
            attempts.set(key, row);
            return { success: true };
          }
          if (sql.includes('INSERT INTO signup_slug_reservations')) {
            reservations.set(String(args[0]), {
              site_id: args[0],
              owner_email: args[1],
              stripe_session_id: args[2],
              created_at: args[3],
              expires_at: args[4]
            });
            return { success: true };
          }
          if (sql.includes('DELETE FROM signup_slug_reservations WHERE site_id')) {
            reservations.delete(String(args[0]));
            return { success: true };
          }
          if (sql.startsWith('DELETE FROM signup_slug_reservations WHERE expires_at')) {
            for (const [siteId, row] of reservations) {
              if (Number(row.expires_at) <= Number(args[0])) reservations.delete(siteId);
            }
            return { success: true };
          }
          return { success: true };
        },
        async first() {
          if (sql.includes('SELECT attempts FROM signup_attempts')) {
            return attempts.get(`${args[0]}::${args[1]}`) ?? null;
          }
          if (sql.includes('FROM signup_slug_reservations')) {
            const row = reservations.get(String(args[0]));
            if (!row) return null;
            return Number(row.expires_at) > Number(args[1]) ? row : null;
          }
          return null;
        }
      };
      return api;
    }
  };
}

describe('signup rate limit', () => {
  it('allows attempts below the limit', () => {
    const decision = signupRateLimitDecision({ attempts: 2, nowMs: 1000, windowStart: 0 });
    expect(decision.allowed).toBe(true);
  });

  it('blocks at the limit and reports when to retry', () => {
    const decision = signupRateLimitDecision({
      attempts: SIGNUP_RATE_LIMIT_MAX,
      nowMs: SIGNUP_RATE_LIMIT_WINDOW_MS / 2,
      windowStart: 0
    });
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSec).toBe(SIGNUP_RATE_LIMIT_WINDOW_MS / 2000);
  });

  it('counts attempts per client and blocks the sixth in a window', async () => {
    const db = fakeBillingDb();
    const clientKey = await hashSignupClientKey('203.0.113.7');
    /** @type {boolean[]} */
    const allowed = [];
    for (let i = 0; i < SIGNUP_RATE_LIMIT_MAX + 1; i += 1) {
      const result = await consumeSignupAttempt(/** @type {never} */ (db), { clientKey, nowMs: 5000 });
      allowed.push(result.allowed);
    }
    expect(allowed.filter(Boolean)).toHaveLength(SIGNUP_RATE_LIMIT_MAX);
    expect(allowed.at(-1)).toBe(false);
  });

  it('tracks clients independently', async () => {
    const db = fakeBillingDb();
    const first = await hashSignupClientKey('203.0.113.7');
    const second = await hashSignupClientKey('203.0.113.8');
    for (let i = 0; i < SIGNUP_RATE_LIMIT_MAX; i += 1) {
      await consumeSignupAttempt(/** @type {never} */ (db), { clientKey: first, nowMs: 5000 });
    }
    const blocked = await consumeSignupAttempt(/** @type {never} */ (db), { clientKey: first, nowMs: 5000 });
    const other = await consumeSignupAttempt(/** @type {never} */ (db), { clientKey: second, nowMs: 5000 });
    expect(blocked.allowed).toBe(false);
    expect(other.allowed).toBe(true);
  });

  it('never stores the raw client address', async () => {
    const key = await hashSignupClientKey('203.0.113.7');
    expect(key).toMatch(/^[0-9a-f]{64}$/);
    expect(key).not.toContain('203.0.113.7');
  });

  it('reads the client ip from Cloudflare headers', () => {
    const request = new Request('https://platform.lovely-home.co.uk/api/public/signup', {
      headers: { 'CF-Connecting-IP': '198.51.100.4' }
    });
    expect(signupClientIp(request)).toBe('198.51.100.4');
  });

  it('is a no-op without a database', async () => {
    const result = await consumeSignupAttempt(null, { clientKey: 'abc' });
    expect(result.allowed).toBe(true);
  });
});

describe('signup slug reservations', () => {
  it('holds a slug for the reservation window and releases it on demand', async () => {
    const db = fakeBillingDb();
    const nowMs = 1_000_000;

    await reserveSignupSlug(/** @type {never} */ (db), {
      siteId: 'rose-cottage',
      ownerEmail: 'owner@example.com',
      sessionId: 'cs_test',
      nowMs
    });

    const held = await getActiveSignupReservation(/** @type {never} */ (db), 'rose-cottage', nowMs);
    expect(held?.site_id).toBe('rose-cottage');

    await releaseSignupReservation(/** @type {never} */ (db), 'rose-cottage');
    expect(await getActiveSignupReservation(/** @type {never} */ (db), 'rose-cottage', nowMs)).toBeNull();
  });

  it('expires reservations so abandoned checkouts free the name', async () => {
    const db = fakeBillingDb();
    const nowMs = 1_000_000;
    await reserveSignupSlug(/** @type {never} */ (db), {
      siteId: 'rose-cottage',
      ownerEmail: 'owner@example.com',
      nowMs
    });

    const later = nowMs + SIGNUP_RESERVATION_TTL_MS + 1;
    expect(await getActiveSignupReservation(/** @type {never} */ (db), 'rose-cottage', later)).toBeNull();
  });
});

describe('turnstile', () => {
  it('is inert until both keys are set', () => {
    expect(turnstileConfigured({})).toBe(false);
    expect(turnstileConfigured({ TURNSTILE_SITE_KEY: 'a' })).toBe(false);
    expect(turnstileConfigured({ TURNSTILE_SITE_KEY: 'a', TURNSTILE_SECRET_KEY: 'b' })).toBe(true);
    expect(turnstileSiteKey({ TURNSTILE_SITE_KEY: ' a ' })).toBe('a');
  });

  it('skips verification when unconfigured', async () => {
    const result = await verifyTurnstileToken({}, { token: '' });
    expect(result).toMatchObject({ ok: true, skipped: true });
  });

  it('reads the siteverify verdict', () => {
    expect(turnstileVerdict({ success: true }).ok).toBe(true);
    expect(turnstileVerdict({ success: false, 'error-codes': ['bad'] })).toMatchObject({
      ok: false,
      codes: ['bad']
    });
  });

  it('fails closed when siteverify is unreachable', async () => {
    const result = await verifyTurnstileToken(
      { TURNSTILE_SITE_KEY: 'a', TURNSTILE_SECRET_KEY: 'b' },
      {
        token: 'token',
        fetchImpl: async () => {
          throw new Error('network down');
        }
      }
    );
    expect(result.ok).toBe(false);
    expect(result.codes).toContain('verification-failed');
  });

  it('rejects a missing token when configured', async () => {
    const result = await verifyTurnstileToken(
      { TURNSTILE_SITE_KEY: 'a', TURNSTILE_SECRET_KEY: 'b' },
      { token: '' }
    );
    expect(result.ok).toBe(false);
    expect(result.codes).toContain('missing-input-response');
  });
});
