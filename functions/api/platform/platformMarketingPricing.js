/**
 * Operator-editable marketing copy for public pricing (display only).
 * Stripe products, prices, and coupons remain env-driven at checkout.
 */
import { introOfferBenefitCopy, INTRO_OFFER_CHECKOUT_NOTE } from './platformIntroOffer.js';
import { referralBenefitCopy } from './platformReferrals.js';
import { buildPublicPricingFromPlans } from './platformPublicPricing.js';

export const MARKETING_PRICING_SETTING_KEY = 'marketing_pricing_display';
export const MARKETING_PRICING_MAX_LENGTH = 500;

/**
 * @typedef {object} MarketingPricingOverrides
 * @property {string} [productName]
 * @property {number} [trialDays]
 * @property {string} [monthlyLabel]
 * @property {string} [yearlyLabel]
 * @property {string} [annualSavingsLabel]
 * @property {string} [checkoutSummary]
 * @property {string} [signupSummary]
 * @property {{ monthlyBenefit?: string, yearlyBenefit?: string, checkoutNote?: string }} [introOffer]
 * @property {{ monthlyReferee?: string, yearlyReferee?: string, monthlyReferrer?: string, yearlyReferrer?: string }} [referral]
 */

/**
 * @param {unknown} value
 * @param {number} [max]
 */
export function sanitizeMarketingText(value, max = MARKETING_PRICING_MAX_LENGTH) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

/**
 * @param {unknown} raw
 * @returns {MarketingPricingOverrides}
 */
export function parseMarketingPricingOverrides(raw) {
  if (!raw) return {};
  let parsed = raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text || text === '{}') return {};
    try {
      parsed = JSON.parse(text);
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

  /** @type {MarketingPricingOverrides} */
  const out = {};
  const source = /** @type {Record<string, unknown>} */ (parsed);

  const productName = sanitizeMarketingText(source.productName);
  if (productName) out.productName = productName;

  const trialDays = Number(source.trialDays);
  if (Number.isFinite(trialDays) && trialDays >= 0 && trialDays <= 90) {
    out.trialDays = Math.round(trialDays);
  }

  for (const key of ['monthlyLabel', 'yearlyLabel', 'annualSavingsLabel', 'checkoutSummary', 'signupSummary']) {
    const value = sanitizeMarketingText(source[key]);
    if (value) out[/** @type {keyof MarketingPricingOverrides} */ (key)] = value;
  }

  if (source.introOffer && typeof source.introOffer === 'object' && !Array.isArray(source.introOffer)) {
    const introSource = /** @type {Record<string, unknown>} */ (source.introOffer);
    /** @type {NonNullable<MarketingPricingOverrides['introOffer']>} */
    const introOffer = {};
    for (const key of ['monthlyBenefit', 'yearlyBenefit', 'checkoutNote']) {
      const value = sanitizeMarketingText(introSource[key]);
      if (value) introOffer[/** @type {'monthlyBenefit' | 'yearlyBenefit' | 'checkoutNote'} */ (key)] = value;
    }
    if (Object.keys(introOffer).length) out.introOffer = introOffer;
  }

  if (source.referral && typeof source.referral === 'object' && !Array.isArray(source.referral)) {
    const referralSource = /** @type {Record<string, unknown>} */ (source.referral);
    /** @type {NonNullable<MarketingPricingOverrides['referral']>} */
    const referral = {};
    for (const key of ['monthlyReferee', 'yearlyReferee', 'monthlyReferrer', 'yearlyReferrer']) {
      const value = sanitizeMarketingText(referralSource[key]);
      if (value) referral[/** @type {keyof NonNullable<MarketingPricingOverrides['referral']>} */ (key)] = value;
    }
    if (Object.keys(referral).length) out.referral = referral;
  }

  return out;
}

/**
 * @param {D1Database | null | undefined} db
 */
export async function getMarketingPricingOverrides(db) {
  if (!db || typeof db.prepare !== 'function') return {};
  try {
    const row = await db
      .prepare('SELECT value FROM platform_settings WHERE key = ? LIMIT 1')
      .bind(MARKETING_PRICING_SETTING_KEY)
      .first();
    return parseMarketingPricingOverrides(row?.value);
  } catch {
    return {};
  }
}

/**
 * @param {D1Database} db
 * @param {MarketingPricingOverrides} overrides
 */
export async function setMarketingPricingOverrides(db, overrides) {
  const normalized = parseMarketingPricingOverrides(overrides);
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(MARKETING_PRICING_SETTING_KEY, JSON.stringify(normalized), now)
    .run();
  return normalized;
}

/**
 * @param {D1Database} db
 */
export async function clearMarketingPricingOverrides(db) {
  const now = Date.now();
  await db
    .prepare(
      `INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
    )
    .bind(MARKETING_PRICING_SETTING_KEY, '{}', now)
    .run();
}

/**
 * @param {unknown} body
 */
export function validateMarketingPricingPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'INVALID_BODY', message: 'Request body must be a JSON object.' };
  }
  const source = /** @type {Record<string, unknown>} */ (body);
  if (source.reset === true || String(source.reset ?? '').trim().toLowerCase() === 'true') {
    return { ok: true, reset: true };
  }
  const overrides = parseMarketingPricingOverrides(source.overrides ?? source);
  return { ok: true, overrides };
}

/**
 * @param {'month' | 'year'} interval
 * @param {MarketingPricingOverrides} overrides
 */
export function effectiveReferralCopy(interval, overrides) {
  const defaults = referralBenefitCopy(interval);
  const referral = overrides.referral ?? {};
  if (interval === 'year') {
    return {
      referee: referral.yearlyReferee || defaults.referee,
      referrer: referral.yearlyReferrer || defaults.referrer
    };
  }
  return {
    referee: referral.monthlyReferee || defaults.referee,
    referrer: referral.monthlyReferrer || defaults.referrer
  };
}

/**
 * @param {MarketingPricingOverrides} overrides
 */
export function defaultReferralDisplayCopy(overrides) {
  const month = effectiveReferralCopy('month', overrides);
  const year = effectiveReferralCopy('year', overrides);
  return {
    monthlyReferee: month.referee,
    yearlyReferee: year.referee,
    monthlyReferrer: month.referrer,
    yearlyReferrer: year.referrer
  };
}

/**
 * @param {MarketingPricingOverrides} overrides
 */
export function effectiveIntroDisplayCopy(overrides) {
  const intro = overrides.introOffer ?? {};
  return {
    monthlyBenefit: intro.monthlyBenefit || introOfferBenefitCopy('month'),
    yearlyBenefit: intro.yearlyBenefit || introOfferBenefitCopy('year'),
    checkoutNote: intro.checkoutNote || INTRO_OFFER_CHECKOUT_NOTE
  };
}

/**
 * @param {import('./platformPublicPricing.js').PublicPlanPricing} pricing
 * @param {MarketingPricingOverrides} overrides
 */
export function applyMarketingPricingOverrides(pricing, overrides) {
  if (!overrides || !Object.keys(overrides).length) {
    return {
      ...pricing,
      referral: defaultReferralDisplayCopy({})
    };
  }

  /** @type {import('./platformPublicPricing.js').PublicPlanPricing} */
  const next = { ...pricing, plans: { ...pricing.plans } };

  if (overrides.productName) next.productName = overrides.productName;
  if (overrides.trialDays != null) next.trialDays = overrides.trialDays;

  if (overrides.monthlyLabel) {
    next.monthlyLabel = overrides.monthlyLabel;
    if (next.plans.month) {
      next.plans.month = { ...next.plans.month, label: overrides.monthlyLabel };
    }
  }
  if (overrides.yearlyLabel) {
    next.yearlyLabel = overrides.yearlyLabel;
    if (next.plans.year) {
      next.plans.year = { ...next.plans.year, label: overrides.yearlyLabel };
    }
  }
  if (overrides.annualSavingsLabel) next.annualSavingsLabel = overrides.annualSavingsLabel;

  const labelFieldsChanged =
    Boolean(overrides.monthlyLabel || overrides.yearlyLabel || overrides.trialDays != null) &&
    !overrides.checkoutSummary &&
    !overrides.signupSummary;

  if (labelFieldsChanged) {
    const rebuilt = buildPublicPricingFromPlans(next.plans, next.productName, {
      trialDays: overrides.trialDays ?? next.trialDays
    });
    next.trialDays = rebuilt.trialDays;
    next.checkoutSummary = rebuilt.checkoutSummary;
    next.signupSummary = rebuilt.signupSummary;
    if (!overrides.annualSavingsLabel) {
      next.annualSavingsLabel = rebuilt.annualSavingsLabel;
      next.annualSavingsPercent = rebuilt.annualSavingsPercent;
    }
  }

  if (overrides.checkoutSummary) next.checkoutSummary = overrides.checkoutSummary;
  if (overrides.signupSummary) next.signupSummary = overrides.signupSummary;

  const introCopy = effectiveIntroDisplayCopy(overrides);
  if (next.introOffer?.active) {
    next.introOffer = {
      ...next.introOffer,
      monthlyBenefit: introCopy.monthlyBenefit,
      yearlyBenefit: introCopy.yearlyBenefit,
      checkoutNote: introCopy.checkoutNote
    };
  }

  next.referral = defaultReferralDisplayCopy(overrides);
  next.marketingDisplayOverrides = true;
  return next;
}

/**
 * @param {import('./platformPublicPricing.js').PublicPlanPricing} stripePricing
 * @param {MarketingPricingOverrides} overrides
 */
export function buildEffectiveMarketingPricing(stripePricing, overrides) {
  const withReferralDefaults = applyMarketingPricingOverrides(stripePricing, {});
  if (!overrides || !Object.keys(overrides).length) {
    return withReferralDefaults;
  }
  return applyMarketingPricingOverrides(stripePricing, overrides);
}

/**
 * @param {D1Database | null | undefined} db
 * @param {'month' | 'year'} interval
 */
export async function getReferralBenefitCopy(db, interval) {
  const overrides = await getMarketingPricingOverrides(db);
  return effectiveReferralCopy(interval, overrides);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {import('./platformPublicPricing.js').PublicPlanPricing} stripePricing
 */
export async function describeMarketingPricing(env, db, stripePricing) {
  const overrides = await getMarketingPricingOverrides(db);
  const effective = buildEffectiveMarketingPricing(stripePricing, overrides);
  const introDefaults = {
    monthlyBenefit: introOfferBenefitCopy('month'),
    yearlyBenefit: introOfferBenefitCopy('year'),
    checkoutNote: INTRO_OFFER_CHECKOUT_NOTE
  };
  const referralDefaults = defaultReferralDisplayCopy({});

  return {
    ok: true,
    hasOverrides: Object.keys(overrides).length > 0,
    overrides,
    stripeDefaults: {
      productName: stripePricing.productName,
      trialDays: stripePricing.trialDays,
      monthlyLabel: stripePricing.monthlyLabel,
      yearlyLabel: stripePricing.yearlyLabel,
      annualSavingsLabel: stripePricing.annualSavingsLabel,
      checkoutSummary: stripePricing.checkoutSummary,
      signupSummary: stripePricing.signupSummary,
      introOffer: introDefaults,
      referral: referralDefaults
    },
    effective: {
      productName: effective.productName,
      trialDays: effective.trialDays,
      monthlyLabel: effective.monthlyLabel,
      yearlyLabel: effective.yearlyLabel,
      annualSavingsLabel: effective.annualSavingsLabel,
      checkoutSummary: effective.checkoutSummary,
      signupSummary: effective.signupSummary,
      introOffer: effectiveIntroDisplayCopy(overrides),
      referral: effective.referral ?? referralDefaults
    }
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null | undefined} db
 * @param {import('./platformPublicPricing.js').PublicPlanPricing} stripePricing
 * @param {unknown} body
 */
export async function applyMarketingPricingSetting(env, db, stripePricing, body = {}) {
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

  const validated = validateMarketingPricingPayload(body);
  if (!validated.ok) {
    return {
      status: 400,
      body: {
        ok: false,
        error: validated.error,
        message: validated.message
      }
    };
  }

  if (validated.reset) {
    await clearMarketingPricingOverrides(db);
  } else {
    await setMarketingPricingOverrides(db, validated.overrides ?? {});
  }

  const description = await describeMarketingPricing(env, db, stripePricing);
  return {
    status: 200,
    body: {
      ok: true,
      ...description
    }
  };
}
