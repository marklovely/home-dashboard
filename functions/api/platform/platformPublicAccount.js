/**
 * Public account page: email OTP, then Stripe Customer Portal.
 *
 * The marketing site is static. This API lives on platform Pages (same
 * pattern as public signup). Card updates and cancel stay on Stripe.
 */

import {
  closeFreeHubSubscription,
  createUpgradeCheckoutSession,
  downgradePlusToFreeSubscription,
  listSiteBillingByOwnerEmail,
  stripeApiRequest
} from './platformBilling.js';
import { resolveBillingRowPlanTier } from './platformPublicHubPlan.js';
import { planTierFromBillingRow } from './platformPlanTier.js';
import { getActiveStripeCredentials } from './platformStripeMode.js';
import {
  customerEmailConfigured,
  customerHubUrl,
  sendDowngradeConfirmationEmail,
  sendResendEmail
} from './platformCustomerEmail.js';
import { marketingSiteOrigin } from './platformPublicSignup.js';
import { consumeSignupAttempt, hashSignupClientKey } from './platformSignupGuards.js';
import { turnstileSiteKey, verifyTurnstileToken } from './platformSignupTurnstile.js';
import { createReferralCodeForSite, isReferrerEligible, referralsConfigured } from './platformReferrals.js';
import { getStripeMode } from './platformStripeMode.js';

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
  return `${marketingSiteOrigin(env)}/account`;
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
  const status = String(row.status ?? '');
  const plan = planTierFromBillingRow(row);
  const canManageBilling = Boolean(String(row.stripe_customer_id ?? '').trim());
  return {
    siteId,
    hubUrl: customerHubUrl(siteId),
    status,
    plan,
    trialEnd: Number(row.trial_end) > 0 ? Number(row.trial_end) : null,
    canManageBilling,
    canUpgrade:
      plan === 'free' &&
      status === 'active' &&
      canManageBilling &&
      Boolean(String(row.stripe_subscription_id ?? '').trim()),
    canDowngrade:
      plan === 'plus' &&
      (status === 'active' || status === 'trialing') &&
      canManageBilling &&
      Boolean(String(row.stripe_subscription_id ?? '').trim()),
    canRefer:
      plan === 'plus' &&
      (status === 'active' || status === 'trialing') &&
      isReferrerEligible(row),
    canCloseHub:
      plan === 'free' &&
      status === 'active' &&
      canManageBilling &&
      Boolean(String(row.stripe_subscription_id ?? '').trim())
  };
}

/**
 * Resolve plan tier from Stripe when D1 is stale, then build public hub cards.
 *
 * @param {Record<string, string | undefined>} env
 * @param {D1Database} db
 * @param {Record<string, unknown>[]} rows
 */
export async function publicAccountHubsFromRows(env, db, rows) {
  const hubs = [];
  for (const row of rows) {
    const resolved = (await resolveBillingRowPlanTier(env, db, row)) ?? row;
    hubs.push(publicAccountHubFromRow(resolved));
  }
  return hubs;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} siteId
 */
export function accountUpgradeCheckoutUrls(env, siteId) {
  const base = accountPageUrl(env);
  const encoded = encodeURIComponent(String(siteId ?? '').trim().toLowerCase());
  return {
    successUrl: `${base}?upgraded=1&site=${encoded}`,
    cancelUrl: `${base}?upgrade_canceled=1&site=${encoded}`
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
      hubs: await publicAccountHubsFromRows(env, db, rows),
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
  const stripe = await getActiveStripeCredentials(env, db ?? null);
  if (!stripe.configured) {
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
    const portal = await stripeRequest(stripe.credentials.secretKey, 'POST', '/billing_portal/sessions', {
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
      hubs: await publicAccountHubsFromRows(env, db, rows),
      expiresAt: session.expiresAt
    }
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {{ sessionToken: string; siteId: string; billingInterval?: string }} input
 * @param {{ nowMs?: number }} [deps]
 */
export async function handleAccountDowngradeToFree(env, db, input, deps = {}) {
  if (!db) {
    return {
      status: 503,
      body: { error: 'BILLING_DB_NOT_CONFIGURED', message: 'Billing is not available right now.' }
    };
  }

  const nowMs = deps.nowMs ?? Date.now();
  const siteId = String(input.siteId ?? '')
    .trim()
    .toLowerCase();
  const token = String(input.sessionToken ?? '').trim();
  if (!siteId) {
    return {
      status: 400,
      body: { error: 'INVALID_INPUT', message: 'siteId is required.' }
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
  if (!row) {
    return {
      status: 404,
      body: { error: 'HUB_NOT_FOUND', message: 'We could not find that hub on your account.' }
    };
  }

  const resolvedRow = (await resolveBillingRowPlanTier(env, db, row)) ?? row;
  const plan = planTierFromBillingRow(resolvedRow);
  const status = String(resolvedRow.status ?? '');
  const customerId = String(resolvedRow.stripe_customer_id ?? '').trim();
  const priorSubscriptionId = String(resolvedRow.stripe_subscription_id ?? '').trim();

  if (
    resolvedRow.owner_email &&
    session.email &&
    normalizeAccountEmail(resolvedRow.owner_email) !== session.email
  ) {
    return {
      status: 403,
      body: { error: 'FORBIDDEN', message: 'That hub does not belong to this account.' }
    };
  }

  if (plan !== 'plus' || (status !== 'active' && status !== 'trialing')) {
    return {
      status: 409,
      body: {
        error: 'DOWNGRADE_NOT_AVAILABLE',
        message:
          plan === 'free'
            ? 'This hub is already on the Free plan.'
            : 'This hub cannot be switched to Free right now. Email support@lovely-home.co.uk.'
      }
    };
  }

  if (!customerId || !priorSubscriptionId) {
    return {
      status: 503,
      body: {
        error: 'DOWNGRADE_NOT_READY',
        message: 'Billing is not linked yet. Email support@lovely-home.co.uk.'
      }
    };
  }

  const stripe = await getActiveStripeCredentials(env, db);
  try {
    const result = await downgradePlusToFreeSubscription(env, db, {
      siteId,
      customerId,
      priorSubscriptionId,
      ownerEmail: resolvedRow.owner_email ? String(resolvedRow.owner_email) : session.email,
      mode: stripe.mode
    });
    if (!result.ok) {
      return {
        status: 503,
        body: {
          error: result.error ?? 'DOWNGRADE_FAILED',
          message: result.message ?? 'Could not switch to the Free plan.'
        }
      };
    }

    const ownerEmail = resolvedRow.owner_email ? String(resolvedRow.owner_email) : session.email;
    await sendDowngradeConfirmationEmail(env, { siteId, ownerEmail });

    return {
      status: 200,
      body: {
        ok: true,
        siteId,
        plan: 'free',
        message:
          'Your hub is now on the Free plan. Existing guides and stays stay as they are; you can add up to two guide templates and two scheduled stays going forward.'
      }
    };
  } catch (error) {
    return {
      status: 502,
      body: {
        error: 'DOWNGRADE_FAILED',
        message: error instanceof Error ? error.message : 'Could not switch to the Free plan.'
      }
    };
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {object} manifest
 * @param {{ sessionToken: string; siteId: string }} input
 * @param {{ nowMs?: number }} [deps]
 */
export async function handleAccountCloseHub(env, db, manifest, input, deps = {}) {
  if (!db) {
    return {
      status: 503,
      body: { error: 'BILLING_DB_NOT_CONFIGURED', message: 'Billing is not available right now.' }
    };
  }

  const nowMs = deps.nowMs ?? Date.now();
  const siteId = String(input.siteId ?? '')
    .trim()
    .toLowerCase();
  const token = String(input.sessionToken ?? '').trim();
  if (!siteId) {
    return {
      status: 400,
      body: { error: 'INVALID_INPUT', message: 'siteId is required.' }
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
  if (!row) {
    return {
      status: 404,
      body: { error: 'HUB_NOT_FOUND', message: 'We could not find that hub on your account.' }
    };
  }

  const resolvedRow = (await resolveBillingRowPlanTier(env, db, row)) ?? row;
  const plan = planTierFromBillingRow(resolvedRow);
  const status = String(resolvedRow.status ?? '');
  const customerId = String(resolvedRow.stripe_customer_id ?? '').trim();
  const subscriptionId = String(resolvedRow.stripe_subscription_id ?? '').trim();

  if (
    resolvedRow.owner_email &&
    session.email &&
    normalizeAccountEmail(resolvedRow.owner_email) !== session.email
  ) {
    return {
      status: 403,
      body: { error: 'FORBIDDEN', message: 'That hub does not belong to this account.' }
    };
  }

  if (plan !== 'free' || status !== 'active') {
    return {
      status: 409,
      body: {
        error: 'CLOSE_NOT_AVAILABLE',
        message:
          plan !== 'free'
            ? 'Switch to the Free plan first, or cancel Lovely Home+ from Stripe to close the hub.'
            : 'This hub is not active anymore.'
      }
    };
  }

  if (!customerId || !subscriptionId) {
    return {
      status: 503,
      body: {
        error: 'CLOSE_NOT_READY',
        message: 'Billing is not linked yet. Email support@lovely-home.co.uk.'
      }
    };
  }

  const stripe = await getActiveStripeCredentials(env, db);
  try {
    const result = await closeFreeHubSubscription(env, db, manifest, {
      siteId,
      customerId,
      subscriptionId,
      ownerEmail: resolvedRow.owner_email ? String(resolvedRow.owner_email) : session.email,
      mode: stripe.mode
    });
    if (!result.ok) {
      return {
        status: 503,
        body: {
          error: result.error ?? 'CLOSE_FAILED',
          message: result.message ?? 'Could not close the hub.'
        }
      };
    }
    return {
      status: 200,
      body: {
        ok: true,
        siteId,
        status: 'canceled',
        message:
          'Your hub is closing. Download a full backup first if you have not already — we archive guide JSON only after teardown.'
      }
    };
  } catch (error) {
    return {
      status: 502,
      body: {
        error: 'CLOSE_FAILED',
        message: error instanceof Error ? error.message : 'Could not close the hub.'
      }
    };
  }
}

export async function handleAccountUpgradeCheckout(env, db, input, deps = {}) {
  const stripe = await getActiveStripeCredentials(env, db);
  if (!stripe.configured) {
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
  if (!row) {
    return {
      status: 404,
      body: { error: 'HUB_NOT_FOUND', message: 'We could not find that hub on your account.' }
    };
  }

  const resolvedRow = (await resolveBillingRowPlanTier(env, db, row)) ?? row;
  const plan = planTierFromBillingRow(resolvedRow);
  const status = String(resolvedRow.status ?? '');
  const customerId = String(resolvedRow.stripe_customer_id ?? '').trim();
  const priorSubscriptionId = String(resolvedRow.stripe_subscription_id ?? '').trim();

  if (
    resolvedRow.owner_email &&
    session.email &&
    normalizeAccountEmail(resolvedRow.owner_email) !== session.email
  ) {
    return {
      status: 403,
      body: { error: 'FORBIDDEN', message: 'That hub does not belong to this account.' }
    };
  }

  if (plan !== 'free' || status !== 'active') {
    return {
      status: 409,
      body: {
        error: 'UPGRADE_NOT_AVAILABLE',
        message:
          plan === 'plus'
            ? 'This hub is already on Lovely Home+. Manage billing on Stripe instead.'
            : 'This hub cannot be upgraded right now. Email support@lovely-home.co.uk.'
      }
    };
  }

  if (!customerId || !priorSubscriptionId) {
    return {
      status: 503,
      body: {
        error: 'UPGRADE_NOT_READY',
        message: 'Billing is not linked yet. Email support@lovely-home.co.uk.'
      }
    };
  }

  const urls = accountUpgradeCheckoutUrls(env, siteId);
  try {
    const checkout = await createUpgradeCheckoutSession(env, {
      siteId,
      customerId,
      priorSubscriptionId,
      successUrl: urls.successUrl,
      cancelUrl: urls.cancelUrl,
      billingInterval: input.billingInterval,
      mode: stripe.mode
    });
    if (!checkout.ok) {
      return {
        status: 503,
        body: {
          error: checkout.error ?? 'STRIPE_CHECKOUT_FAILED',
          message: checkout.message ?? 'Could not start Stripe Checkout.'
        }
      };
    }
    return {
      status: 200,
      body: {
        ok: true,
        siteId,
        checkoutUrl: checkout.url,
        sessionId: checkout.sessionId
      }
    };
  } catch (error) {
    return {
      status: 502,
      body: {
        error: 'STRIPE_CHECKOUT_FAILED',
        message: error instanceof Error ? error.message : 'Could not start Stripe Checkout.'
      }
    };
  }
}

export async function handleAccountReferralCode(env, db, input, deps = {}) {
  if (!db) {
    return {
      status: 503,
      body: { error: 'BILLING_DB_NOT_CONFIGURED', message: 'Referrals are not available right now.' }
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

  const siteId = String(input.siteId ?? '').trim().toLowerCase();
  if (!siteId) {
    return {
      status: 400,
      body: { error: 'INVALID_SITE_ID', message: 'Choose which hub the referral link is for.' }
    };
  }

  const result = await createReferralCodeForSite(db, env, {
    sessionEmail: session.email,
    siteId,
    billingInterval: input.billingInterval,
    nowMs
  });
  return { status: result.status, body: result.body };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} [db]
 */
export async function publicAccountStatus(env, db = null) {
  const mode = await getStripeMode(db);
  return {
    turnstileSiteKey: turnstileSiteKey(env),
    referralsEnabled: referralsConfigured(env, mode)
  };
}
