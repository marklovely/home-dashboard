/**
 * Guards for the public signup endpoint: per-client throttling and slug
 * reservations that hold a hub address while Stripe Checkout is open.
 *
 * Signup no longer builds infrastructure, so a reservation is the only thing
 * stopping two people paying for the same hostname.
 */

/** Reservations outlive a Checkout session but expire so abandoned slugs return. */
export const SIGNUP_RESERVATION_TTL_MS = 60 * 60 * 1000;

/** Signup attempts allowed per client within one window. */
export const SIGNUP_RATE_LIMIT_MAX = 5;

/** Rolling window for the signup rate limit. */
export const SIGNUP_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * Hash the client address so throttling never stores raw IPs.
 *
 * @param {string} clientIp
 * @returns {Promise<string>}
 */
export async function hashSignupClientKey(clientIp) {
  const normalized = String(clientIp ?? '').trim().toLowerCase() || 'unknown';
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {Request} request
 */
export function signupClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP')?.trim() ||
    request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim() ||
    ''
  );
}

/**
 * Pure window maths so the limit is testable without D1.
 *
 * @param {{ attempts: number; nowMs: number; windowStart: number; limit?: number; windowMs?: number }} input
 */
export function signupRateLimitDecision(input) {
  const limit = input.limit ?? SIGNUP_RATE_LIMIT_MAX;
  const windowMs = input.windowMs ?? SIGNUP_RATE_LIMIT_WINDOW_MS;
  if (input.attempts < limit) {
    return { allowed: true, retryAfterSec: 0 };
  }
  const elapsed = Math.max(0, input.nowMs - input.windowStart);
  return {
    allowed: false,
    retryAfterSec: Math.max(1, Math.ceil((windowMs - elapsed) / 1000))
  };
}

/**
 * Count this attempt and report whether the client may continue.
 *
 * @param {D1Database | null | undefined} db
 * @param {{ clientKey: string; nowMs?: number; limit?: number; windowMs?: number }} input
 */
export async function consumeSignupAttempt(db, input) {
  if (!db) return { allowed: true, retryAfterSec: 0, attempts: 0 };
  const nowMs = input.nowMs ?? Date.now();
  const windowMs = input.windowMs ?? SIGNUP_RATE_LIMIT_WINDOW_MS;
  const windowStart = Math.floor(nowMs / windowMs) * windowMs;

  await db
    .prepare(
      `INSERT INTO signup_attempts (client_key, window_start, attempts)
       VALUES (?, ?, 1)
       ON CONFLICT(client_key, window_start)
       DO UPDATE SET attempts = signup_attempts.attempts + 1`
    )
    .bind(input.clientKey, windowStart)
    .run();

  const row = await db
    .prepare('SELECT attempts FROM signup_attempts WHERE client_key = ? AND window_start = ?')
    .bind(input.clientKey, windowStart)
    .first();
  const attempts = Number(row?.attempts ?? 1);

  // attempts includes the current request, so compare the count before it.
  const decision = signupRateLimitDecision({
    attempts: attempts - 1,
    nowMs,
    windowStart,
    limit: input.limit,
    windowMs
  });
  return { ...decision, attempts };
}

/**
 * @param {D1Database | null | undefined} db
 * @param {number} [nowMs]
 */
export async function pruneExpiredSignupData(db, nowMs = Date.now()) {
  if (!db) return;
  await db.prepare('DELETE FROM signup_slug_reservations WHERE expires_at <= ?').bind(nowMs).run();
  await db
    .prepare('DELETE FROM signup_attempts WHERE window_start <= ?')
    .bind(nowMs - SIGNUP_RATE_LIMIT_WINDOW_MS * 24)
    .run();
}

/**
 * @param {D1Database | null | undefined} db
 * @param {string} siteId
 * @param {number} [nowMs]
 */
export async function getActiveSignupReservation(db, siteId, nowMs = Date.now()) {
  if (!db) return null;
  const row = await db
    .prepare(
      `SELECT site_id, owner_email, stripe_session_id, created_at, expires_at
       FROM signup_slug_reservations
       WHERE site_id = ? AND expires_at > ?`
    )
    .bind(siteId, nowMs)
    .first();
  return row ?? null;
}

/**
 * @param {D1Database | null | undefined} db
 * @param {{ siteId: string; ownerEmail: string; sessionId?: string | null; nowMs?: number; ttlMs?: number }} input
 */
export async function reserveSignupSlug(db, input) {
  if (!db) return { ok: true, reserved: true, skipped: true };
  const nowMs = input.nowMs ?? Date.now();
  const expiresAt = nowMs + (input.ttlMs ?? SIGNUP_RESERVATION_TTL_MS);
  const result = await db
    .prepare(
      `INSERT INTO signup_slug_reservations (site_id, owner_email, stripe_session_id, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(site_id) DO UPDATE SET
         owner_email = excluded.owner_email,
         stripe_session_id = excluded.stripe_session_id,
         created_at = excluded.created_at,
         expires_at = excluded.expires_at
       WHERE signup_slug_reservations.expires_at <= excluded.created_at
          OR lower(signup_slug_reservations.owner_email) = lower(excluded.owner_email)`
    )
    .bind(input.siteId, input.ownerEmail, input.sessionId ?? null, nowMs, expiresAt)
    .run();
  const reserved = Number(result?.meta?.changes ?? 0) > 0;
  return { ok: true, reserved, expiresAt: reserved ? expiresAt : null };
}

/**
 * @param {D1Database | null | undefined} db
 * @param {string} siteId
 */
export async function releaseSignupReservation(db, siteId) {
  if (!db) return;
  await db.prepare('DELETE FROM signup_slug_reservations WHERE site_id = ?').bind(siteId).run();
}
