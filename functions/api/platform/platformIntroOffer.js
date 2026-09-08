/**
 * Introductory discount for first-time households at public signup.
 * Referrals take precedence; operator billing checkout never applies intro offers.
 */
import { listSiteBillingByOwnerEmail } from './platformBilling.js';
import { getStripeMode } from './platformStripeMode.js';
import { normalizeReferralBillingInterval } from './platformReferrals.js';
import { normalizeAccountEmail } from './platformPublicAccount.js';

export const INTRO_OFFER_SETTING_KEY = 'intro_offer_enabled';

export const INTRO_OFFER_CHECKOUT_NOTE =
  'Your introductory discount is applied on the secure Stripe checkout page when you continue — not in the prices above, because those apply after your free trial.';

/**
 * @param {'month' | 'year'} interval
 */
export function introOfferBenefitCopy(interval) {
  if (interval === 'year') {
    return '30% off your first year (applied on your first invoice after the trial)';
  }
  return '25% off each of your first two months (starting on your first invoice after the trial)';
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'test' | 'live'} mode
 * @param {'month' | 'year'} interval
 */
export function introCouponIdForInterval(env, mode, interval) {
  const yearly = interval === 'year';
  if (mode === 'live') {
    return yearly
      ? env.STRIPE_INTRO_COUPON_YEARLY_LIVE?.trim() || ''
      : env.STRIPE_INTRO_COUPON_MONTHLY_LIVE?.trim() || '';
  }
  return yearly
    ? env.STRIPE_INTRO_COUPON_YEARLY?.trim() || ''
    : env.STRIPE_INTRO_COUPON_MONTHLY?.trim() || '';
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'test' | 'live'} [mode]
 */
export function introOfferConfigured(env, mode = 'test') {
  return Boolean(introCouponIdForInterval(env, mode, 'month') && introCouponIdForInterval(env, mode, 'year'));
}

/**
 * @param {D1Database | null | undefined} db
 */
export async function getIntroOfferEnabled(db) {
  if (!db || typeof db.prepare !== 'function') return false;
  try {
    const row = await db
      .prepare('SELECT value FROM platform_settings WHERE key = ? LIMIT 1')
      .bind(INTRO_OFFER_SETTING_KEY)
      .first();
    return String(row?.value ?? '').trim().toLowerCase() === 'true';
  } catch {
    return false;
  }
}

/**
 * @param {D1Database} db
 * @param {boolean} enabled
 */
export async function setIntroOfferEnabled(db, enabled) {
  const next = enabled ? 'true' : 'false';
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(INTRO_OFFER_SETTING_KEY, next, now)
    .run();
  return enabled;
}

/**
 * @param {D1Database | null | undefined} db
 * @param {string} ownerEmail
 */
export async function isEmailEligibleForIntroOffer(db, ownerEmail) {
  if (!db || typeof db.prepare !== 'function') return false;
  const email = normalizeAccountEmail(ownerEmail);
  if (!email) return false;
  const rows = await listSiteBillingByOwnerEmail(db, email);
  return rows.length === 0;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 */
export async function describeIntroOffer(env, db) {
  const mode = await getStripeMode(db);
  const enabled = await getIntroOfferEnabled(db);
  const configured = introOfferConfigured(env, mode);
  const active = enabled && configured;
  return {
    enabled,
    configured,
    active,
    monthlyBenefit: introOfferBenefitCopy('month'),
    yearlyBenefit: introOfferBenefitCopy('year'),
    checkoutNote: INTRO_OFFER_CHECKOUT_NOTE
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {{
 *   customerEmail: string;
 *   billingInterval?: string;
 *   referralCode?: string;
 * }} input
 */
export async function resolveIntroOfferForSignup(env, db, input) {
  const referralCode = String(input.referralCode ?? '').trim();
  if (referralCode) {
    return { apply: false, reason: 'REFERRAL_PRESENT' };
  }

  const intro = await describeIntroOffer(env, db);
  if (!intro.active) {
    return { apply: false, reason: intro.enabled ? 'NOT_CONFIGURED' : 'DISABLED' };
  }

  const eligible = await isEmailEligibleForIntroOffer(db, input.customerEmail);
  if (!eligible) {
    return { apply: false, reason: 'EXISTING_CUSTOMER' };
  }

  const interval = normalizeReferralBillingInterval(input.billingInterval);
  return {
    apply: true,
    interval,
    benefit: introOfferBenefitCopy(interval)
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {{ enabled?: unknown }} body
 */
export async function applyIntroOfferSetting(env, db, body = {}) {
  if (!db) {
    return {
      status: 503,
      body: {
        ok: false,
        error: 'BILLING_DB_NOT_CONFIGURED',
        message: 'PLATFORM_BILLING_DB binding is missing.'
      }
    };
  }

  const mode = await getStripeMode(db);
  const configured = introOfferConfigured(env, mode);
  const enabled = body.enabled === true || String(body.enabled ?? '').trim().toLowerCase() === 'true';

  if (enabled && !configured) {
    return {
      status: 400,
      body: {
        ok: false,
        error: 'INTRO_COUPONS_MISSING',
        message:
          'Intro offer coupons are not set on the platform Pages project. Add STRIPE_INTRO_COUPON_MONTHLY and STRIPE_INTRO_COUPON_YEARLY (and live twins) via Terraform before enabling.'
      }
    };
  }

  await setIntroOfferEnabled(db, enabled);
  const status = await describeIntroOffer(env, db);
  return {
    status: 200,
    body: {
      ok: true,
      ...status
    }
  };
}
