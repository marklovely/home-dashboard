import { getPlatformBillingDb, stripeApiRequest } from './platformBilling.js';
import { describeIntroOffer } from './platformIntroOffer.js';
import {
  applyMarketingPricingOverrides,
  defaultReferralDisplayCopy,
  effectiveIntroDisplayCopy,
  getMarketingPricingOverrides
} from './platformMarketingPricing.js';
import { getActiveStripeCredentials } from './platformStripeMode.js';

/**
 * @typedef {'month' | 'year'} BillingIntervalKey
 *
 * @typedef {{
 *   interval: BillingIntervalKey;
 *   label: string;
 *   amount: number | null;
 *   unitAmountMinor: number | null;
 *   currency: string;
 * }} PublicPlanOption
 *
 * @typedef {{
 *   configured: boolean;
 *   trialDays: number;
 *   productName: string;
 *   plans: Partial<Record<BillingIntervalKey, PublicPlanOption>>;
 *   monthlyLabel: string | null;
 *   yearlyLabel: string | null;
 *   annualSavingsLabel: string | null;
 *   annualSavingsPercent: number | null;
 *   checkoutSummary: string;
 *   signupSummary: string;
 *   vatNote: string;
 *   introOffer?: {
 *     active: boolean;
 *     monthlyBenefit?: string;
 *     yearlyBenefit?: string;
 *     checkoutNote?: string;
 *   };
 *   referral?: {
 *     monthlyReferee: string;
 *     yearlyReferee: string;
 *     monthlyReferrer: string;
 *     yearlyReferrer: string;
 *   };
 *   marketingDisplayOverrides?: boolean;
 * }} PublicPlanPricing
 */

/**
 * @param {number | null | undefined} unitAmountMinor
 * @param {string} currency
 */
export function formatMinorCurrency(unitAmountMinor, currency) {
  const minor = Number(unitAmountMinor);
  if (!Number.isFinite(minor)) return null;
  const code = String(currency || 'gbp').toUpperCase();
  const zeroDecimal = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']).has(code);
  const amount = zeroDecimal ? minor : minor / 100;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(amount);
}

/**
 * @param {string | null | undefined} interval
 * @param {number | null | undefined} intervalCount
 */
export function formatBillingInterval(interval, intervalCount) {
  const count = Number(intervalCount) || 1;
  const unit = String(interval ?? 'month').toLowerCase();
  if (count === 1) {
    if (unit === 'month') return 'month';
    if (unit === 'year') return 'year';
    if (unit === 'week') return 'week';
    if (unit === 'day') return 'day';
    return unit;
  }
  return `${count} ${unit}s`;
}

/**
 * @param {unknown} pricePayload
 * @returns {{ option: PublicPlanOption; productName: string | null }}
 */
export function buildPlanOptionFromStripePrice(pricePayload) {
  const price = pricePayload && typeof pricePayload === 'object' ? /** @type {Record<string, unknown>} */ (pricePayload) : {};
  const recurring = price.recurring && typeof price.recurring === 'object' ? /** @type {Record<string, unknown>} */ (price.recurring) : {};
  const product = price.product && typeof price.product === 'object' ? /** @type {Record<string, unknown>} */ (price.product) : null;

  const currency = String(price.currency ?? 'gbp').toLowerCase();
  const unitAmountMinor = price.unit_amount == null ? null : Number(price.unit_amount);
  const stripeInterval = recurring.interval ? String(recurring.interval).toLowerCase() : 'month';
  const intervalCount = Number(recurring.interval_count) || 1;
  /** @type {BillingIntervalKey} */
  const interval = stripeInterval === 'year' && intervalCount === 1 ? 'year' : 'month';
  const label =
    unitAmountMinor == null
      ? ''
      : `${formatMinorCurrency(unitAmountMinor, currency)}/${formatBillingInterval(stripeInterval, intervalCount)}`;
  const amount =
    unitAmountMinor == null ? null : unitAmountMinor / (currency === 'jpy' ? 1 : 100);

  return {
    option: {
      interval,
      label,
      amount: Number.isFinite(amount) ? amount : null,
      unitAmountMinor: Number.isFinite(unitAmountMinor) ? unitAmountMinor : null,
      currency
    },
    productName: product?.name ? String(product.name) : null
  };
}

/**
 * @param {PublicPlanOption | null | undefined} monthPlan
 * @param {PublicPlanOption | null | undefined} yearPlan
 */
export function computeAnnualSavings(monthPlan, yearPlan) {
  const monthlyMinor = monthPlan?.unitAmountMinor;
  const yearlyMinor = yearPlan?.unitAmountMinor;
  const currency = yearPlan?.currency || monthPlan?.currency || 'gbp';
  if (monthlyMinor == null || yearlyMinor == null) return null;

  const annualIfMonthly = monthlyMinor * 12;
  const savingsMinor = annualIfMonthly - yearlyMinor;
  if (savingsMinor <= 0) return null;

  const savingsLabel = formatMinorCurrency(savingsMinor, currency);
  return {
    savingsMinor,
    savingsLabel: savingsLabel ? `Save ${savingsLabel} vs paying monthly` : null,
    savingsPercent: Math.round((savingsMinor / annualIfMonthly) * 100)
  };
}

/**
 * @param {Partial<Record<BillingIntervalKey, PublicPlanOption>>} plans
 * @param {string} productName
 * @param {{ trialDays?: number }} [options]
 * @returns {PublicPlanPricing}
 */
export function buildPublicPricingFromPlans(plans, productName, options = {}) {
  const monthPlan = plans.month ?? null;
  const yearPlan = plans.year ?? null;
  const trialDays = Number.isFinite(Number(options.trialDays)) ? Number(options.trialDays) : 0;
  const savings = computeAnnualSavings(monthPlan, yearPlan);
  const monthlyLabel = monthPlan?.label || null;
  const yearlyLabel = yearPlan?.label || null;
  const displayProductName = productName?.trim() ? productName : 'Lovely Home';

  let checkoutSummary =
    'Free forever for one home — two guides and two scheduled stays.';
  if (monthlyLabel && yearlyLabel) {
    checkoutSummary = `Free forever for one home — two guides and two scheduled stays. Lovely Home+ from ${monthlyLabel} or ${yearlyLabel} removes limits.`;
  } else if (monthlyLabel) {
    checkoutSummary = `Free forever for one home — two guides and two scheduled stays. Lovely Home+ from ${monthlyLabel} removes limits.`;
  } else if (yearlyLabel) {
    checkoutSummary = `Free forever for one home — two guides and two scheduled stays. Lovely Home+ from ${yearlyLabel} removes limits.`;
  }

  let signupSummary =
    'Create your free home — one home, two guides, two scheduled stays, free forever.';
  if (monthlyLabel && yearlyLabel) {
    signupSummary = `Create your free home — one home, two guides, two scheduled stays, free forever. Upgrade to Lovely Home+ (${monthlyLabel} or ${yearlyLabel}) anytime for unlimited guides and scheduled stays.`;
  } else if (monthlyLabel) {
    signupSummary = `Create your free home — one home, two guides, two scheduled stays, free forever. Upgrade to Lovely Home+ (${monthlyLabel}) anytime for unlimited guides and scheduled stays.`;
  } else if (yearlyLabel) {
    signupSummary = `Create your free home — one home, two guides, two scheduled stays, free forever. Upgrade to Lovely Home+ (${yearlyLabel}) anytime for unlimited guides and scheduled stays.`;
  }

  return {
    configured: Boolean(monthPlan || yearPlan),
    trialDays,
    productName: displayProductName,
    plans: {
      ...(monthPlan ? { month: monthPlan } : {}),
      ...(yearPlan ? { year: yearPlan } : {})
    },
    monthlyLabel,
    yearlyLabel,
    annualSavingsLabel: savings?.savingsLabel ?? null,
    annualSavingsPercent: savings?.savingsPercent ?? null,
    checkoutSummary,
    signupSummary,
    vatNote: ''
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<PublicPlanPricing>}
 */
export async function fetchStripePlanPricing(env) {
  const db = getPlatformBillingDb(env);
  const { credentials } = await getActiveStripeCredentials(env, db);
  const secretKey = credentials.secretKey;
  const monthlyPriceId = credentials.priceId;
  const yearlyPriceId = credentials.priceIdYearly;
  const empty = buildPublicPricingFromPlans({}, 'Lovely Home');

  if (!secretKey || (!monthlyPriceId && !yearlyPriceId)) {
    return { ...empty, configured: false, trialDays: 0 };
  }

  /** @type {Partial<Record<BillingIntervalKey, PublicPlanOption>>} */
  const plans = {};
  let productName = 'Lovely Home';

  const fetches = [];
  if (monthlyPriceId) {
    fetches.push(
      stripeApiRequest(secretKey, 'GET', `/prices/${encodeURIComponent(monthlyPriceId)}?expand[]=product`).then(
        (payload) => {
          const built = buildPlanOptionFromStripePrice(payload);
          plans.month = built.option;
          if (built.productName) productName = built.productName;
        }
      )
    );
  }
  if (yearlyPriceId) {
    fetches.push(
      stripeApiRequest(secretKey, 'GET', `/prices/${encodeURIComponent(yearlyPriceId)}?expand[]=product`).then(
        (payload) => {
          const built = buildPlanOptionFromStripePrice(payload);
          plans.year = built.option;
          if (built.productName) productName = built.productName;
        }
      )
    );
  }

  await Promise.all(fetches);
  return buildPublicPricingFromPlans(plans, productName);
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<PublicPlanPricing>}
 */
export async function getPublicPlanPricing(env) {
  const db = getPlatformBillingDb(env);
  const pricing = await fetchStripePlanPricing(env);
  const intro = await describeIntroOffer(env, db);
  const withIntro = {
    ...pricing,
    introOffer: intro.active
      ? {
          active: true,
          monthlyBenefit: intro.monthlyBenefit,
          yearlyBenefit: intro.yearlyBenefit,
          checkoutNote: intro.checkoutNote
        }
      : { active: false }
  };
  const overrides = await getMarketingPricingOverrides(db);
  const merged = applyMarketingPricingOverrides(withIntro, overrides);
  return {
    ...merged,
    displayCopy: buildPublicDisplayCopy(merged, overrides)
  };
}

/**
 * @param {PublicPlanPricing} pricing
 * @param {import('./platformMarketingPricing.js').MarketingPricingOverrides} overrides
 */
export function buildPublicDisplayCopy(pricing, overrides) {
  const introCopy = effectiveIntroDisplayCopy(overrides);
  const referral = pricing.referral ?? defaultReferralDisplayCopy(overrides);
  return {
    trialDays: pricing.trialDays,
    monthlyLabel: pricing.monthlyLabel,
    yearlyLabel: pricing.yearlyLabel,
    checkoutSummary: pricing.checkoutSummary,
    signupSummary: pricing.signupSummary,
    introMonthlyBenefit: introCopy.monthlyBenefit,
    introYearlyBenefit: introCopy.yearlyBenefit,
    referralMonthlyReferee: referral.monthlyReferee,
    referralYearlyReferee: referral.yearlyReferee,
    referralMonthlyReferrer: referral.monthlyReferrer,
    referralYearlyReferrer: referral.yearlyReferrer
  };
}
