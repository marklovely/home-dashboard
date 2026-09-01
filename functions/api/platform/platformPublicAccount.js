/**
 * Public account page: email OTP, then Stripe Customer Portal.
 *
 * The marketing site is static. This API lives on platform Pages (same
 * pattern as public signup). Card updates and cancel stay on Stripe.
 */

import {
  listSiteBillingByOwnerEmail,
  stripeApiRequest,
  stripeBillingConfigured
} from './platformBilling.js';
import { customerEmailConfigured, customerHubUrl, sendResendEmail } from './platformCustomerEmail.js';
import { marketingSiteOrigin } from './platformPublicSignup.js';
import { consumeSignupAttempt, hashSignupClientKey } from './platformSignupGuards.js';
import { turnstileSiteKey, verifyTurnstileToken } from './platformSignupTurnstile.js';

export const ACCOUNT_OTP_TTL_MS = 10 * 60 * 1000;
export const ACCOUNT_SESSION_TTL_MS = 30 * 60 * 1000;
export const ACCOUNT_OTP_MAX_ATTEMPTS = 5;
export const ACCOUNT_OTP_RESEND_MS = 45 * 1000;
export const ACCOUNT_RATE_LIMIT_MAX = 8;
export const ACCOUNT_GENERIC_OTP_MESSAGE =
  'If that email has a Lovely Home hub, we sent a six-digit code.';
export const ACCOUNT_SESSION_EXPIRED_MESSAGE =
  'You have been signed out. Enter your email for a new code.';

/**
 * @param {string} email
 */
export function normalizeAccountEmail(email) {
  return String(email ?? '')
    .trim()
    .toLowerCase();
}

/**
 * @param {string} email
 */
export function accountEmailLooksValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAccountEmail(email));
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function accountPageUrl(env) {
  return `${marketingSiteOrigin(env)}/account.html`;
}

/**
 * @param {number} [randomInt]
 */
export function generateAccountOtpCode(randomInt) {
  const n =
    typeof randomInt === 'number'
      ? randomInt
      : crypto.getRandomValues(new Uint32Array(1))[0];
  return String(n % 1_000_000).padStart(6, '0');
}

/**
 * @param {string} value
 */
export async function hashAccountSecret(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * @param {string} left
 * @param {string} right
 */
export function timingSafeEqual(left, right) {
  const a = String(left ?? '');
  const b = String(right ?? '');
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * @param {Record<string, unknown>} row
 */
export function publicAccountHubFromRow(row) {
  const siteId = String(row.site_id ?? '');
  return {
    siteId,
    hubUrl: customerHubUrl(siteId),
    status: String(row.status ?? ''),
    trialEnd: Number(row.trial_end) > 0 ? Number(row.trial_end) : null,
    canManageBilling: Boolean(String(row.stripe_customer_id ?? '').trim())
  };
}

/**
 * @param {D1Database | null | undefined} db
 * @param {number} [nowMs]
 */
export async function pruneExpiredAccountAuth(db, nowMs = Date.now()) {
  if (!db) return;
  await db.prepare('DELETE FROM account_otp_challenges WHERE expires_at <= ?').bind(nowMs).run();
  await db.prepare('DELETE FROM account_sessions WHERE expires_at <= ?').bind(nowMs).run();
}

/**
 * @param {D1Database} db
 * @param {string} sessionToken
 * @param {number} [nowMs]
 * @returns {Promise<{ email: string, expiresAt: number } | null>}
 */
export async function loadAccountSession(db, sessionToken, nowMs = Date.now()) {
  const token = String(sessionToken ?? '').trim();
  if (!token) return null;
  await pruneExpiredAccountAuth(db, nowMs);
  const tokenHash = await hashAccountSecret(token);
  const session = await db
    .prepare('SELECT email, expires_at FROM account_sessions WHERE token_hash = ? LIMIT 1')
    .bind(tokenHash)
    .first();
  if (!session || Number(session.expires_at) <= nowMs) return null;
  return { email: String(session.email ?? ''), expiresAt: Number(session.expires_at) };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {{
 *   email: string;
 *   clientIp?: string;
 *   turnstileToken?: string;
 * }} input
 * @param {{
 *   sendEmail?: typeof sendResendEmail;
 *   generateCode?: () => string;
 *   fetchImpl?: typeof fetch;
 *   nowMs?: number;
 * }} [deps]
 */
export async function handleAccountOtpRequest(env, db, input, deps = {}) {
  const email = normalizeAccountEmail(input.email);
  if (!accountEmailLooksValid(email)) {
    return {
      status: 400,
      body: { error: 'INVALID_EMAIL', message: 'Enter a valid email address.' }
    };
  }
  if (!db) {
    return {
      status: 503,
      body: { error: 'BILLING_DB_NOT_CONFIGURED', message: 'Account sign-in is not available right now.' }
    };
  }
  if (!customerEmailConfigured(env)) {
    return {
      status: 503,
      body: { error: 'EMAIL_NOT_CONFIGURED', message: 'Could not send a code right now. Try again shortly.' }
    };
  }

  const nowMs = deps.nowMs ?? Date.now();
  await pruneExpiredAccountAuth(db, nowMs);

  const turnstile = await verifyTurnstileToken(env, {
    token: input.turnstileToken ?? '',
    clientIp: input.clientIp,
    fetchImpl: deps.fetchImpl
  });
  if (!turnstile.ok) {
    return {
      status: 400,
      body: { error: 'TURNSTILE_FAILED', message: 'Complete the “I am human” check to continue.' }
    };
  }

  const clientKey = `account:${await hashSignupClientKey(input.clientIp ?? '')}`;
  const limit = await consumeSignupAttempt(db, {
    clientKey,
    nowMs,
    limit: ACCOUNT_RATE_LIMIT_MAX
  });
  if (!limit.allowed) {
    return {
      status: 429,
      retryAfterSec: limit.retryAfterSec,
      body: {
        error: 'RATE_LIMITED',
        message: 'Too many tries. Wait a few minutes and try again.',
        retryAfterSec: limit.retryAfterSec
      }
    };
  }

  const hubs = await listSiteBillingByOwnerEmail(db, email);
  if (!hubs.length) {
    return { status: 200, body: { ok: true, message: ACCOUNT_GENERIC_OTP_MESSAGE } };
  }

  const existing = await db
    .prepare('SELECT sent_at FROM account_otp_challenges WHERE email = ? LIMIT 1')
    .bind(email)
    .first();
  const sentAt = Number(existing?.sent_at ?? 0);
  if (sentAt && nowMs - sentAt < ACCOUNT_OTP_RESEND_MS) {
    return { status: 200, body: { ok: true, message: ACCOUNT_GENERIC_OTP_MESSAGE } };
  }

  const generateCode = deps.generateCode ?? generateAccountOtpCode;
  const code = generateCode();
  const codeHash = await hashAccountSecret(`${email}:${code}`);
  await db
    .prepare(
      `INSERT INTO account_otp_challenges (email, code_hash, expires_at, attempts, sent_at)
       VALUES (?, ?, ?, 0, ?)
       ON CONFLICT(email) DO UPDATE SET
         code_hash = excluded.code_hash,
         expires_at = excluded.expires_at,
         attempts = 0,
         sent_at = excluded.sent_at`
    )
    .bind(email, codeHash, nowMs + ACCOUNT_OTP_TTL_MS, nowMs)
    .run();

  const sendEmail = deps.sendEmail ?? sendResendEmail;
  const sent = await sendEmail(
    env,
    {
      to: email,
      subject: 'Your Lovely Home account code',
      text: [
        `Your Lovely Home sign-in code is ${code}.`,
        '',
        'It expires in 10 minutes. If you did not request this, you can ignore the email.',
        '',
        `Manage your hub: ${accountPageUrl(env)}`
      ].join('\n')
    },
    deps.fetchImpl
  );
  if (!sent.ok) {
    return {
      status: 503,
      body: { error: 'EMAIL_SEND_FAILED', message: 'Could not send a code right now. Try again shortly.' }
    };
  }

  return { status: 200, body: { ok: true, message: ACCOUNT_GENERIC_OTP_MESSAGE } };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {{ email: string; code: string }} input
 * @param {{ nowMs?: number }} [deps]
 */
export async function handleAccountVerify(env, db, input, deps = {}) {
  const email = normalizeAccountEmail(input.email);
  const code = String(input.code ?? '').replace(/\s+/g, '');
  if (!accountEmailLooksValid(email) || !/^\d{6}$/.test(code)) {
    return {
      status: 400,
      body: { error: 'INVALID_CODE', message: 'Enter the six-digit code from your email.' }
    };
  }
  if (!db) {
    return {
      status: 503,
      body: { error: 'BILLING_DB_NOT_CONFIGURED', message: 'Account sign-in is not available right now.' }
    };
  }

  const nowMs = deps.nowMs ?? Date.now();
  await pruneExpiredAccountAuth(db, nowMs);

  const challenge = await db
    .prepare(
      `SELECT code_hash, expires_at, attempts FROM account_otp_challenges WHERE email = ? LIMIT 1`
    )
    .bind(email)
    .first();
  if (!challenge || Number(challenge.expires_at) <= nowMs) {
    return {
      status: 401,
      body: { error: 'INVALID_CODE', message: 'That code is wrong or has expired. Request a new one.' }
    };
  }

  const attempts = Number(challenge.attempts ?? 0);
  if (attempts >= ACCOUNT_OTP_MAX_ATTEMPTS) {
    await db.prepare('DELETE FROM account_otp_challenges WHERE email = ?').bind(email).run();
    return {
      status: 401,
      body: { error: 'INVALID_CODE', message: 'That code is wrong or has expired. Request a new one.' }
    };
  }

  const expected = String(challenge.code_hash ?? '');
  const actual = await hashAccountSecret(`${email}:${code}`);
  if (!timingSafeEqual(expected, actual)) {
    await db
      .prepare('UPDATE account_otp_challenges SET attempts = attempts + 1 WHERE email = ?')
      .bind(email)
      .run();
    return {
      status: 401,
      body: { error: 'INVALID_CODE', message: 'That code is wrong or has expired. Request a new one.' }
    };
  }

  await db.prepare('DELETE FROM account_otp_challenges WHERE email = ?').bind(email).run();
  const tokenBytes = new Uint8Array(32);
  crypto.getRandomValues(tokenBytes);
  const token = [...tokenBytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const tokenHash = await hashAccountSecret(token);
  await db
    .prepare('INSERT INTO account_sessions (token_hash, email, expires_at) VALUES (?, ?, ?)')
    .bind(tokenHash, email, nowMs + ACCOUNT_SESSION_TTL_MS)
    .run();

  const rows = await listSiteBillingByOwnerEmail(db, email);
  return {
    status: 200,
    body: {
      ok: true,
      sessionToken: token,
      email,
      hubs: rows.map(publicAccountHubFromRow),
      expiresAt: nowMs + ACCOUNT_SESSION_TTL_MS
    }
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {{ sessionToken: string; siteId: string }} input
 * @param {{ nowMs?: number; stripeRequest?: typeof stripeApiRequest }} [deps]
 */
export async function handleAccountPortal(env, db, input, deps = {}) {
  if (!stripeBillingConfigured(env)) {
    return {
      status: 503,
      body: { error: 'STRIPE_NOT_CONFIGURED', message: 'Billing is not available right now.' }
    };
  }
  if (!db) {
    return {
      status: 503,
      body: { error: 'BILLING_DB_NOT_CONFIGURED', message: 'Account sign-in is not available right now.' }
    };
  }

  const nowMs = deps.nowMs ?? Date.now();
  const token = String(input.sessionToken ?? '').trim();
  const siteId = String(input.siteId ?? '').trim().toLowerCase();
  if (!token || !siteId) {
    return {
      status: 400,
      body: { error: 'INVALID_SESSION', message: ACCOUNT_SESSION_EXPIRED_MESSAGE }
    };
  }

  const session = await loadAccountSession(db, token, nowMs);
  if (!session) {
    return {
      status: 401,
      body: { error: 'INVALID_SESSION', message: ACCOUNT_SESSION_EXPIRED_MESSAGE }
    };
  }

  const rows = await listSiteBillingByOwnerEmail(db, session.email);
  const row = rows.find((item) => String(item.site_id) === siteId);
  const customerId = String(row?.stripe_customer_id ?? '').trim();
  if (!row || !customerId) {
    return {
      status: 404,
      body: { error: 'HUB_NOT_FOUND', message: 'We could not open billing for that hub.' }
    };
  }

  const stripeRequest = deps.stripeRequest ?? stripeApiRequest;
  try {
    const portal = await stripeRequest(String(env.STRIPE_SECRET_KEY ?? '').trim(), 'POST', '/billing_portal/sessions', {
      customer: customerId,
      return_url: accountPageUrl(env)
    });
    const url = String(portal.url ?? '').trim();
    if (!url) {
      return {
        status: 503,
        body: { error: 'PORTAL_UNAVAILABLE', message: 'Stripe billing is not available right now. Email support@lovely-home.co.uk.' }
      };
    }
    return { status: 200, body: { ok: true, url } };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    return {
      status: 503,
      body: {
        error: 'PORTAL_UNAVAILABLE',
        message: /activate|portal/i.test(message)
          ? 'Stripe Customer Portal is not enabled yet. Email support@lovely-home.co.uk and we will cancel or update the card for you.'
          : 'Could not open Stripe billing just now. Email support@lovely-home.co.uk.'
      }
    };
  }
}

/**
 * Restore hubs after Stripe Portal returns to the marketing site.
 *
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {{ sessionToken: string }} input
 * @param {{ nowMs?: number }} [deps]
 */
export async function handleAccountSession(env, db, input, deps = {}) {
  if (!db) {
    return {
      status: 503,
      body: { error: 'BILLING_DB_NOT_CONFIGURED', message: 'Account sign-in is not available right now.' }
    };
  }

  const nowMs = deps.nowMs ?? Date.now();
  const session = await loadAccountSession(db, input.sessionToken, nowMs);
  if (!session) {
    return {
      status: 401,
      body: { error: 'INVALID_SESSION', message: ACCOUNT_SESSION_EXPIRED_MESSAGE }
    };
  }

  const rows = await listSiteBillingByOwnerEmail(db, session.email);
  return {
    status: 200,
    body: {
      ok: true,
      email: session.email,
      hubs: rows.map(publicAccountHubFromRow),
      expiresAt: session.expiresAt
    }
  };
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function publicAccountStatus(env) {
  return {
    turnstileSiteKey: turnstileSiteKey(env)
  };
}
