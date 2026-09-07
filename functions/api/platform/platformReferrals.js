/**
 * Single-use referral codes: referee discount at Checkout, referrer account credit
 * when checkout.session.completed fires.
 */
import { getSiteBilling, stripeApiRequest } from './platformBilling.js';
import { getStripeMode, stripeCredentialsForMode } from './platformStripeMode.js';
import { marketingSiteOrigin } from './platformPublicSignup.js';
import { normalizeAccountEmail } from './platformPublicAccount.js';

export const REFERRAL_CODE_RE = /^LH-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
export const REFERRAL_RESERVATION_MS = 30 * 60 * 1000;
export const REFERRAL_GENERATION_DAILY_LIMIT = 10;
export const REFERRAL_REFERRER_CREDIT_MONTHLY_PENCE = 1000;
export const REFERRAL_REFERRER_CREDIT_YEARLY_PENCE = 1500;

const REFERRAL_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * @param {string} value
 */
export function normalizeReferralCode(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/**
 * @param {string} billingInterval
 */
export function normalizeReferralBillingInterval(billingInterval) {
  const interval = String(billingInterval ?? 'month').trim().toLowerCase();
  return interval === 'year' || interval === 'yearly' || interval === 'annual' ? 'year' : 'month';
}

/**
 * @param {'month' | 'year'} interval
 */
export function referralBenefitCopy(interval) {
  if (interval === 'year') {
    return {
      referee: '£15 off your first year after the free trial',
      referrer: '£15 account credit when they complete checkout'
    };
  }
  return {
    referee: '£5 off each of your first two months after the free trial',
    referrer: '£10 account credit when they complete checkout'
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'test' | 'live'} mode
 * @param {'month' | 'year'} interval
 */
export function referralCouponIdForInterval(env, mode, interval) {
  const yearly = interval === 'year';
  if (mode === 'live') {
    return yearly
      ? env.STRIPE_REFERRAL_COUPON_YEARLY_LIVE?.trim() || ''
      : env.STRIPE_REFERRAL_COUPON_MONTHLY_LIVE?.trim() || '';
  }
  return yearly
    ? env.STRIPE_REFERRAL_COUPON_YEARLY?.trim() || ''
    : env.STRIPE_REFERRAL_COUPON_MONTHLY?.trim() || '';
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'test' | 'live'} [mode]
 */
export function referralsConfigured(env, mode = 'test') {
  return Boolean(
    referralCouponIdForInterval(env, mode, 'month') && referralCouponIdForInterval(env, mode, 'year')
  );
}

/**
 * @param {number} [randomInt]
 */
export function generateReferralCodeValue(randomInt) {
  const pick = (offset) => {
    const n =
      typeof randomInt === 'number'
        ? (randomInt + offset) % REFERRAL_ALPHABET.length
        : crypto.getRandomValues(new Uint8Array(1))[0] % REFERRAL_ALPHABET.length;
    return REFERRAL_ALPHABET[n];
  };
  const segment = (base) =>
    [0, 1, 2, 3].map((index) => pick(base + index)).join('');
  return `LH-${segment(0)}-${segment(10)}`;
}

/**
 * @param {D1Database} db
 * @param {number} [nowMs]
 */
export async function pruneExpiredReferralReservations(db, nowMs = Date.now()) {
  const cutoff = nowMs - REFERRAL_RESERVATION_MS;
  await db
    .prepare(
      `UPDATE referral_codes
       SET status = 'active',
           reserved_at = NULL,
           reserved_email = NULL,
           reserved_site_id = NULL,
           stripe_session_id = NULL
       WHERE status = 'reserved'
         AND reserved_at IS NOT NULL
         AND reserved_at <= ?`
    )
    .bind(cutoff)
    .run();
}

/**
 * @param {D1Database} db
 * @param {string} code
 */
async function getReferralCodeRow(db, code) {
  return db.prepare('SELECT * FROM referral_codes WHERE code = ? LIMIT 1').bind(code).first();
}

/**
 * @param {D1Database} db
 * @param {string} referrerSiteId
 * @param {number} [nowMs]
 */
async function countReferralCodesCreatedToday(db, referrerSiteId, nowMs = Date.now()) {
  const dayStart = new Date(nowMs);
  dayStart.setUTCHours(0, 0, 0, 0);
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM referral_codes
       WHERE referrer_site_id = ?
         AND created_at >= ?`
    )
    .bind(referrerSiteId, dayStart.getTime())
    .first();
  return Number(row?.count ?? 0);
}

/**
 * @param {D1Database} db
 * @param {string} referrerSiteId
 */
async function revokeActiveReferralCodes(db, referrerSiteId) {
  await db
    .prepare(
      `UPDATE referral_codes
       SET status = 'revoked'
       WHERE referrer_site_id = ?
         AND status = 'active'`
    )
    .bind(referrerSiteId)
    .run();
}

/**
 * @param {D1Database | null | undefined} db
 * @param {string} code
 * @param {{ nowMs?: number }} [options]
 */
export async function previewReferralCode(db, code, options = {}) {
  const normalized = normalizeReferralCode(code);
  if (!REFERRAL_CODE_RE.test(normalized)) {
    return { valid: false, message: 'That referral link is not valid.' };
  }
  if (!db) {
    return { valid: false, message: 'Referrals are not available right now.' };
  }

  const nowMs = options.nowMs ?? Date.now();
  await pruneExpiredReferralReservations(db, nowMs);
  const row = await getReferralCodeRow(db, normalized);
  if (!row || String(row.status) === 'revoked' || String(row.status) === 'used') {
    return { valid: false, message: 'That referral link has already been used or expired.' };
  }
  if (String(row.status) === 'reserved') {
    return { valid: false, message: 'That referral link is being used by someone else right now.' };
  }

  const interval = normalizeReferralBillingInterval(String(row.billing_interval ?? 'month'));
  const copy = referralBenefitCopy(interval);
  return {
    valid: true,
    code: normalized,
    billingInterval: interval,
    refereeBenefit: copy.referee,
    referrerBenefit: copy.referrer,
    message: copy.referee
  };
}

/**
 * @param {D1Database | null | undefined} db
 * @param {{
 *   code: string;
 *   refereeSiteId: string;
 *   refereeEmail: string;
 *   billingInterval?: string;
 *   nowMs?: number;
 * }} input
 */
export async function validateReferralForSignup(db, input) {
  const code = normalizeReferralCode(input.code);
  const refereeSiteId = String(input.refereeSiteId ?? '').trim().toLowerCase();
  const refereeEmail = normalizeAccountEmail(input.refereeEmail);
  const billingInterval = normalizeReferralBillingInterval(input.billingInterval);
  const nowMs = input.nowMs ?? Date.now();

  if (!code) {
    return { ok: true, referral: null };
  }

  if (!REFERRAL_CODE_RE.test(code)) {
    return { ok: false, error: 'INVALID_REFERRAL', message: 'That referral link is not valid.' };
  }
  if (!db) {
    return { ok: false, error: 'REFERRALS_UNAVAILABLE', message: 'Referrals are not available right now.' };
  }

  await pruneExpiredReferralReservations(db, nowMs);
  const row = await getReferralCodeRow(db, code);
  if (!row || String(row.status) !== 'active') {
    return {
      ok: false,
      error: 'REFERRAL_UNAVAILABLE',
      message: 'That referral link has already been used or is no longer valid.'
    };
  }

  const codeInterval = normalizeReferralBillingInterval(String(row.billing_interval ?? 'month'));
  if (codeInterval !== billingInterval) {
    const expected = codeInterval === 'year' ? 'yearly' : 'monthly';
    return {
      ok: false,
      error: 'REFERRAL_PLAN_MISMATCH',
      message: `That referral link is for ${expected} billing. Switch billing to match the link.`
    };
  }

  const referrerSiteId = String(row.referrer_site_id ?? '').trim().toLowerCase();
  if (!referrerSiteId || referrerSiteId === refereeSiteId) {
    return { ok: false, error: 'REFERRAL_SELF', message: 'You cannot use your own referral link.' };
  }

  const referrerBilling = await getSiteBilling(db, referrerSiteId);
  if (!referrerBilling || !['trialing', 'active', 'past_due'].includes(String(referrerBilling.status))) {
    return {
      ok: false,
      error: 'REFERRAL_REFERRER_INACTIVE',
      message: 'That referral link is no longer valid.'
    };
  }

  if (
    refereeEmail &&
    referrerBilling.owner_email &&
    normalizeAccountEmail(referrerBilling.owner_email) === refereeEmail
  ) {
    return {
      ok: false,
      error: 'REFERRAL_SELF',
      message: 'You cannot use your own referral link.'
    };
  }

  return {
    ok: true,
    referral: {
      code,
      referrerSiteId,
      billingInterval: codeInterval
    }
  };
}

/**
 * @param {D1Database | null | undefined} db
 * @param {{
 *   code: string;
 *   refereeSiteId: string;
 *   refereeEmail: string;
 *   stripeSessionId: string;
 *   nowMs?: number;
 * }} input
 */
export async function reserveReferralCodeForCheckout(db, input) {
  const code = normalizeReferralCode(input.code);
  const nowMs = input.nowMs ?? Date.now();
  if (!db || !code) return { ok: true, reserved: false };

  await pruneExpiredReferralReservations(db, nowMs);
  const result = await db
    .prepare(
      `UPDATE referral_codes
       SET status = 'reserved',
           reserved_at = ?,
           reserved_email = ?,
           reserved_site_id = ?,
           stripe_session_id = ?
       WHERE code = ?
         AND status = 'active'`
    )
    .bind(
      nowMs,
      normalizeAccountEmail(input.refereeEmail),
      String(input.refereeSiteId ?? '').trim().toLowerCase(),
      String(input.stripeSessionId ?? '').trim(),
      code
    )
    .run();

  return { ok: true, reserved: Number(result.meta?.changes ?? 0) > 0 };
}

/**
 * @param {D1Database | null | undefined} db
 * @param {string} siteId
 */
export async function releaseReferralReservationForSite(db, siteId) {
  if (!db || typeof db.prepare !== 'function') return;
  await db
    .prepare(
      `UPDATE referral_codes
       SET status = 'active',
           reserved_at = NULL,
           reserved_email = NULL,
           reserved_site_id = NULL,
           stripe_session_id = NULL
       WHERE reserved_site_id = ?
         AND status = 'reserved'`
    )
    .bind(String(siteId ?? '').trim().toLowerCase())
    .run();
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database} db
 * @param {{
 *   sessionId: string;
 *   refereeSiteId: string;
 *   referralCode?: string | null;
 *   referrerSiteId?: string | null;
 *   billingInterval?: string;
 *   fetchImpl?: typeof fetch;
 *   nowMs?: number;
 * }} input
 */
export async function fulfillReferralFromCheckoutSession(env, db, input) {
  const sessionId = String(input.sessionId ?? '').trim();
  const refereeSiteId = String(input.refereeSiteId ?? '').trim().toLowerCase();
  const referralCode = normalizeReferralCode(input.referralCode ?? '');
  const referrerSiteId = String(input.referrerSiteId ?? '').trim().toLowerCase();
  const billingInterval = normalizeReferralBillingInterval(input.billingInterval);
  const nowMs = input.nowMs ?? Date.now();

  if (!sessionId || !referralCode || !referrerSiteId || !refereeSiteId) {
    return { ok: true, action: 'referral_skipped' };
  }

  await pruneExpiredReferralReservations(db, nowMs);
  const row = await getReferralCodeRow(db, referralCode);
  if (!row) {
    return { ok: false, error: 'REFERRAL_NOT_FOUND', message: 'Referral code was not found.' };
  }
  if (String(row.status) === 'used' && String(row.used_by_site_id) === refereeSiteId) {
    return { ok: true, action: 'referral_already_fulfilled' };
  }
  if (String(row.status) !== 'reserved' && String(row.status) !== 'active') {
    return { ok: false, error: 'REFERRAL_INVALID_STATE', message: 'Referral code is not redeemable.' };
  }
  if (String(row.stripe_session_id ?? '') && String(row.stripe_session_id) !== sessionId) {
    return { ok: false, error: 'REFERRAL_SESSION_MISMATCH', message: 'Referral code session mismatch.' };
  }
  if (String(row.referrer_site_id) !== referrerSiteId) {
    return { ok: false, error: 'REFERRAL_REFERRER_MISMATCH', message: 'Referral referrer mismatch.' };
  }

  const markUsed = await db
    .prepare(
      `UPDATE referral_codes
       SET status = 'used',
           used_at = ?,
           used_by_site_id = ?,
           stripe_session_id = ?,
           reserved_at = NULL,
           reserved_email = NULL,
           reserved_site_id = NULL
       WHERE code = ?
         AND status IN ('active', 'reserved')
         AND referrer_site_id = ?`
    )
    .bind(nowMs, refereeSiteId, sessionId, referralCode, referrerSiteId)
    .run();
  if (Number(markUsed.meta?.changes ?? 0) === 0) {
    const latest = await getReferralCodeRow(db, referralCode);
    if (String(latest?.status) === 'used' && String(latest?.used_by_site_id) === refereeSiteId) {
      return { ok: true, action: 'referral_already_fulfilled' };
    }
    return { ok: false, error: 'REFERRAL_MARK_USED_FAILED', message: 'Could not mark referral code used.' };
  }

  if (Number(row.referrer_rewarded_at) > 0) {
    return { ok: true, action: 'referral_reward_already_sent' };
  }

  const referrerBilling = await getSiteBilling(db, referrerSiteId);
  const customerId = String(referrerBilling?.stripe_customer_id ?? '').trim();
  if (!customerId) {
    return { ok: false, error: 'REFERRER_CUSTOMER_MISSING', message: 'Referrer billing customer missing.' };
  }

  const mode = await getStripeMode(db);
  const secretKey = stripeCredentialsForMode(env, mode).secretKey;
  if (!secretKey) {
    return { ok: false, error: 'STRIPE_NOT_CONFIGURED', message: 'Stripe is not configured.' };
  }

  const creditPence =
    billingInterval === 'year' ? REFERRAL_REFERRER_CREDIT_YEARLY_PENCE : REFERRAL_REFERRER_CREDIT_MONTHLY_PENCE;
  await stripeApiRequest(secretKey, 'POST', `/customers/${customerId}/balance_transactions`, {
    amount: -creditPence,
    currency: 'gbp',
    description: `Referral reward for ${refereeSiteId} (${billingInterval})`
  });

  await db
    .prepare('UPDATE referral_codes SET referrer_rewarded_at = ? WHERE code = ?')
    .bind(nowMs, referralCode)
    .run();

  return {
    ok: true,
    action: 'referral_fulfilled',
    referrerSiteId,
    refereeSiteId,
    creditPence
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} code
 */
export function referralSignupUrl(env, code) {
  const base = marketingSiteOrigin(env);
  return `${base}/signup.html?ref=${encodeURIComponent(code)}`;
}

/**
 * @param {D1Database | null | undefined} db
 * @param {Record<string, string | undefined>} env
 * @param {{
 *   sessionEmail: string;
 *   siteId: string;
 *   billingInterval?: string;
 *   nowMs?: number;
 * }} input
 */
export async function createReferralCodeForSite(db, env, input) {
  const siteId = String(input.siteId ?? '').trim().toLowerCase();
  const sessionEmail = normalizeAccountEmail(input.sessionEmail);
  const billingInterval = normalizeReferralBillingInterval(input.billingInterval);
  const nowMs = input.nowMs ?? Date.now();

  if (!db) {
    return {
      ok: false,
      status: 503,
      body: { error: 'BILLING_DB_NOT_CONFIGURED', message: 'Referrals are not available right now.' }
    };
  }
  if (!referralsConfigured(env, await getStripeMode(db))) {
    return {
      ok: false,
      status: 503,
      body: {
        error: 'REFERRALS_NOT_CONFIGURED',
        message: 'Referrals are not enabled on this platform yet.'
      }
    };
  }

  const billing = await getSiteBilling(db, siteId);
  if (!billing || !['trialing', 'active', 'past_due'].includes(String(billing.status))) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'REFERRAL_NOT_ELIGIBLE',
        message: 'Only active hub subscriptions can generate referral links.'
      }
    };
  }
  if (
    billing.owner_email &&
    sessionEmail &&
    normalizeAccountEmail(billing.owner_email) !== sessionEmail
  ) {
    return { ok: false, status: 403, body: { error: 'FORBIDDEN', message: 'That hub does not belong to this account.' } };
  }

  const createdToday = await countReferralCodesCreatedToday(db, siteId, nowMs);
  if (createdToday >= REFERRAL_GENERATION_DAILY_LIMIT) {
    return {
      ok: false,
      status: 429,
      body: {
        error: 'REFERRAL_LIMIT',
        message: 'You have generated enough referral links for today. Try again tomorrow.'
      }
    };
  }

  await revokeActiveReferralCodes(db, siteId);

  let code = '';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = generateReferralCodeValue(nowMs + attempt);
    try {
      await db
        .prepare(
          `INSERT INTO referral_codes (
            code, referrer_site_id, billing_interval, status, created_at
          ) VALUES (?, ?, ?, 'active', ?)`
        )
        .bind(candidate, siteId, billingInterval, nowMs)
        .run();
      code = candidate;
      break;
    } catch {
      // Collision — try another code.
    }
  }

  if (!code) {
    return {
      ok: false,
      status: 503,
      body: { error: 'REFERRAL_CREATE_FAILED', message: 'Could not create a referral link. Try again.' }
    };
  }

  const copy = referralBenefitCopy(billingInterval);
  return {
    ok: true,
    status: 200,
    body: {
      ok: true,
      code,
      url: referralSignupUrl(env, code),
      billingInterval,
      refereeBenefit: copy.referee,
      referrerBenefit: copy.referrer
    }
  };
}
