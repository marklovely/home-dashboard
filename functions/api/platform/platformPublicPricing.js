import { stripeApiRequest, TRIAL_PERIOD_DAYS } from './platformBilling.js';

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
 * @returns {PublicPlanPricing}
 */
export function buildPublicPricingFromPlans(plans, productName) {
  const monthPlan = plans.month ?? null;
  const yearPlan = plans.year ?? null;
  const trialDays = TRIAL_PERIOD_DAYS;
  const savings = computeAnnualSavings(monthPlan, yearPlan);
  const monthlyLabel = monthPlan?.label || null;
  const yearlyLabel = yearPlan?.label || null;

  let checkoutSummary = `${trialDays}-day free trial — card on file, no charge today.`;
  if (monthlyLabel && yearlyLabel) {
    checkoutSummary = `£0 today — then ${monthlyLabel} or ${yearlyLabel} after your ${trialDays}-day trial. Cancel anytime before then.`;
  } else if (monthlyLabel) {
    checkoutSummary = `£0 today — ${monthlyLabel} after your ${trialDays}-day trial. Cancel anytime before then.`;
  } else if (yearlyLabel) {
    checkoutSummary = `£0 today — ${yearlyLabel} after your ${trialDays}-day trial. Cancel anytime before then.`;
  }

  let signupSummary = `${trialDays}-day free trial — card on file for when the trial ends.`;
  if (monthlyLabel && yearlyLabel) {
    signupSummary = `£0 today — choose ${monthlyLabel} or ${yearlyLabel} after the trial. Cancel anytime before billing starts.`;
  } else if (monthlyLabel) {
    signupSummary = `£0 today — then ${monthlyLabel}. Cancel anytime before billing starts.`;
  } else if (yearlyLabel) {
    signupSummary = `£0 today — then ${yearlyLabel}. Cancel anytime before billing starts.`;
  }

  return {
    configured: Boolean(monthPlan || yearPlan),
    trialDays,
    productName,
    plans: {
      ...(monthPlan ? { month: monthPlan } : {}),
      ...(yearPlan ? { year: yearPlan } : {})
    },
    monthlyLabel,
    yearlyLabel,
    annualSavingsLabel: savings?.savingsLabel ?? null,
    annualSavingsPercent: savings?.savingsPercent ?? null,
    checkoutSummary,
    signupSummary
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @returns {Promise<PublicPlanPricing>}
 */
export async function getPublicPlanPricing(env) {
  const secretKey = env.STRIPE_SECRET_KEY?.trim();
  const monthlyPriceId = env.STRIPE_PRICE_ID?.trim();
  const yearlyPriceId = env.STRIPE_PRICE_ID_YEARLY?.trim();
  const trialDays = TRIAL_PERIOD_DAYS;
  const empty = buildPublicPricingFromPlans({}, 'Household Hub');

  if (!secretKey || (!monthlyPriceId && !yearlyPriceId)) {
    return { ...empty, configured: false, trialDays };
  }

  /** @type {Partial<Record<BillingIntervalKey, PublicPlanOption>>} */
  const plans = {};
  let productName = 'Household Hub';

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
