/**
 * Single-use referral codes: referee discount via Stripe coupon on the subscription;
 * referrer account credit when the referee's first paid invoice succeeds.
 */
import { getSiteBilling, getSiteBillingBySubscriptionId, stripeApiRequest } from './platformBilling.js';
import { getStripeMode, stripeCredentialsForMode } from './platformStripeMode.js';
import { maybeSendReferrerRewardEmail } from './platformCustomerEmail.js';
import { getReferralBenefitCopy } from './platformMarketingPricing.js';
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
      referee: '£10 off their first Lovely Home+ year (on their first paid invoice)',
      referrer: '£10 account credit when their first invoice is paid'
    };
  }
  return {
    referee: '£2.50 off each of their first two Lovely Home+ months (on their first paid invoice)',
    referrer: '£5 account credit when their first invoice is paid'
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
 * Referrers may invite others only after their own first paid invoice (not during trial).
 *
 * @param {Record<string, unknown> | null | undefined} billing
 */
export function isReferrerEligible(billing) {
  if (!billing) return false;
  return Number(billing.referrer_eligible_at ?? 0) > 0;
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 * @param {number} [nowMs]
 */
export async function markReferrerEligibleOnFirstPaidInvoice(db, siteId, nowMs = Date.now()) {
  const normalized = String(siteId ?? '').trim().toLowerCase();
  if (!normalized) return { ok: true, action: 'referrer_eligible_skipped' };

  const result = await db
    .prepare(
      `UPDATE site_billing
       SET referrer_eligible_at = ?, updated_at = ?
       WHERE site_id = ?
         AND (referrer_eligible_at IS NULL OR referrer_eligible_at = 0)`
    )
    .bind(nowMs, nowMs, normalized)
    .run();

  return {
    ok: true,
    action: Number(result.meta?.changes ?? 0) > 0 ? 'referrer_eligible_marked' : 'referrer_eligible_already'
  };
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
 * @param {Record<string, unknown>} invoice
 */
export function resolveSiteIdFromInvoiceObject(invoice) {
  const lines = Array.isArray(invoice.lines?.data) ? invoice.lines.data : [];
  for (const line of lines) {
    const siteId = /** @type {{ metadata?: { site_id?: string } }} */ (line)?.metadata?.site_id;
    if (siteId) return String(siteId).trim().toLowerCase();
  }
  const subscriptionDetails =
    /** @type {{ metadata?: { site_id?: string } }} */ (invoice.subscription_details) ??
    /** @type {{ subscription_details?: { metadata?: { site_id?: string } } }} */ (invoice.parent)
      ?.subscription_details;
  const fromSubscription = subscriptionDetails?.metadata?.site_id;
  if (fromSubscription) return String(fromSubscription).trim().toLowerCase();
  const fromInvoice = /** @type {{ site_id?: string }} */ (invoice.metadata ?? {}).site_id;
  if (fromInvoice) return String(fromInvoice).trim().toLowerCase();
  return null;
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
  const copy = await getReferralBenefitCopy(db, interval);
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
  if (!isReferrerEligible(referrerBilling)) {
    return {
      ok: false,
      error: 'REFERRAL_REFERRER_NOT_ELIGIBLE',
      message: 'That referral link is not active yet. Ask your friend to wait until after their first paid invoice.'
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
 * Mark a referral code used once checkout completes (rewards wait for first invoice).
 *
 * @param {D1Database} db
 * @param {{
 *   sessionId: string;
 *   refereeSiteId: string;
 *   referralCode?: string | null;
 *   referrerSiteId?: string | null;
 *   nowMs?: number;
 * }} input
 */
export async function markReferralUsedAtCheckout(db, input) {
  const sessionId = String(input.sessionId ?? '').trim();
  const refereeSiteId = String(input.refereeSiteId ?? '').trim().toLowerCase();
  const referralCode = normalizeReferralCode(input.referralCode ?? '');
  const referrerSiteId = String(input.referrerSiteId ?? '').trim().toLowerCase();
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
    return { ok: true, action: 'referral_already_marked_used' };
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
      return { ok: true, action: 'referral_already_marked_used' };
    }
    return { ok: false, error: 'REFERRAL_MARK_USED_FAILED', message: 'Could not mark referral code used.' };
  }

  return { ok: true, action: 'referral_marked_used', referralCode, refereeSiteId, referrerSiteId };
}

/**
 * Credit the referrer when the referee's first paid invoice succeeds.
 *
 * @param {Record<string, string | undefined>} env
 * @param {D1Database} db
 * @param {{
 *   invoiceId: string;
 *   refereeSiteId?: string | null;
 *   subscriptionId?: string | null;
 *   amountPaid?: number;
 *   nowMs?: number;
 * }} input
 */
export async function fulfillReferrerRewardOnInvoicePaid(env, db, input) {
  const invoiceId = String(input.invoiceId ?? '').trim();
  const amountPaid = Number(input.amountPaid ?? 0);
  const nowMs = input.nowMs ?? Date.now();

  if (!invoiceId || amountPaid <= 0) {
    return { ok: true, action: 'referral_reward_skipped' };
  }

  let refereeSiteId = String(input.refereeSiteId ?? '').trim().toLowerCase();
  if (!refereeSiteId && input.subscriptionId) {
    const billing = await getSiteBillingBySubscriptionId(db, String(input.subscriptionId));
    refereeSiteId = String(billing?.site_id ?? '').trim().toLowerCase();
  }
  if (!refereeSiteId) {
    return { ok: true, action: 'referral_reward_no_site' };
  }

  const row = await db
    .prepare(
      `SELECT * FROM referral_codes
       WHERE used_by_site_id = ?
         AND status = 'used'
         AND (referrer_rewarded_at IS NULL OR referrer_rewarded_at = 0)
       ORDER BY used_at ASC
       LIMIT 1`
    )
    .bind(refereeSiteId)
    .first();
  if (!row) {
    return { ok: true, action: 'referral_reward_not_pending' };
  }

  const referrerSiteId = String(row.referrer_site_id ?? '').trim().toLowerCase();
  const billingInterval = normalizeReferralBillingInterval(String(row.billing_interval ?? 'month'));
  const referrerBilling = await getSiteBilling(db, referrerSiteId);
  if (!isReferrerEligible(referrerBilling)) {
    return { ok: true, action: 'referral_reward_referrer_not_eligible' };
  }
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
    description: `Referral reward for ${refereeSiteId} (${billingInterval}, invoice ${invoiceId})`
  });

  const referralCode = String(row.code ?? '');
  await db
    .prepare('UPDATE referral_codes SET referrer_rewarded_at = ? WHERE code = ?')
    .bind(nowMs, referralCode)
    .run();

  /** @type {Record<string, unknown> | undefined} */
  let email;
  try {
    email = await maybeSendReferrerRewardEmail(env, db, {
      referralCode,
      referrerSiteId,
      ownerEmail: referrerBilling?.owner_email,
      creditPence
    });
  } catch (error) {
    email = {
      ok: false,
      error: 'REFERRAL_EMAIL_FAILED',
      message: error instanceof Error ? error.message : 'Referral reward email failed.'
    };
  }

  return {
    ok: true,
    action: 'referral_reward_fulfilled',
    referralCode,
    referrerSiteId,
    refereeSiteId,
    creditPence,
    ...(email ? { email } : {})
  };
}

/** @deprecated Use markReferralUsedAtCheckout + fulfillReferrerRewardOnInvoicePaid */
export async function fulfillReferralFromCheckoutSession(env, db, input) {
  const marked = await markReferralUsedAtCheckout(db, input);
  if (!marked.ok) return marked;
  return { ...marked, action: marked.action ?? 'referral_marked_used' };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} code
 */
export function referralSignupUrl(env, code) {
  const base = marketingSiteOrigin(env);
  return `${base}/signup?ref=${encodeURIComponent(code)}`;
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
  if (!isReferrerEligible(billing)) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'REFERRAL_NOT_ELIGIBLE',
        message:
          'Referral links unlock after your first paid invoice. Cancelled or unpaid hubs cannot refer.'
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

  const copy = await getReferralBenefitCopy(db, billingInterval);
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
