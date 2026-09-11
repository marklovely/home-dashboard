import { resolveStripeFreePriceId } from './platformBilling.js';
import { marketingSiteOrigin } from './platformPublicSignup.js';

/** @typedef {'free' | 'plus'} PlanTier */

export const FREE_PLAN_MAX_GUIDES = 2;
export const FREE_PLAN_MAX_STAYS = 2;

/** Short copy: two guide templates, unlimited content inside each. */
export const FREE_PLAN_GUIDES_EXPLAINER =
  'Two separate guide templates for your home (for example House Sitter Guide and Pet Care Guide). Each guide can hold unlimited topics and details — the limit is templates, not pages inside them.';

/**
 * @param {PlanTier | string | null | undefined} tier
 */
export function normalizePlanTier(tier) {
  return String(tier ?? '').trim().toLowerCase() === 'free' ? 'free' : 'plus';
}

/**
 * @param {unknown} subscription
 * @returns {{ id?: string, unit_amount?: number | null } | null}
 */
export function stripeSubscriptionPrice(subscription) {
  const sub = /** @type {{ items?: { data?: Array<{ price?: { id?: string, unit_amount?: number | null } }> } }} */ (
    subscription ?? {}
  );
  return sub.items?.data?.[0]?.price ?? null;
}

/**
 * @param {unknown} subscription
 * @returns {string | null}
 */
export function stripeSubscriptionPriceId(subscription) {
  const priceId = stripeSubscriptionPrice(subscription)?.id;
  return priceId ? String(priceId) : null;
}

/**
 * @param {{ unit_amount?: number | null } | null | undefined} price
 * @returns {boolean}
 */
export function isZeroAmountStripePrice(price) {
  const unitAmount = Number(price?.unit_amount ?? NaN);
  return Number.isFinite(unitAmount) && unitAmount === 0;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'test' | 'live'} mode
 * @param {string | null | undefined} priceId
 * @param {{ unit_amount?: number | null } | null | undefined} [price]
 * @returns {PlanTier | null}
 */
export function resolvePlanTierFromPriceId(env, mode, priceId, price) {
  const id = String(priceId ?? '').trim();
  if (!id) return null;
  const freeId = resolveStripeFreePriceId(env, mode);
  if (freeId && id === freeId) return 'free';
  if (isZeroAmountStripePrice(price)) return 'free';
  return 'plus';
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'test' | 'live'} mode
 * @param {unknown} subscription
 * @returns {PlanTier | null}
 */
export function resolvePlanTierFromSubscription(env, mode, subscription) {
  const price = stripeSubscriptionPrice(subscription);
  return resolvePlanTierFromPriceId(env, mode, price?.id ?? null, price);
}

/**
 * @param {PlanTier} plan
 */
export function planFeatures(plan) {
  if (plan === 'free') {
    return { bins: false, smartHome: false, weather: true };
  }
  return { bins: true, smartHome: true, weather: true };
}

/**
 * @param {PlanTier} plan
 */
export function planLimits(plan) {
  const features = planFeatures(plan);
  if (plan === 'free') {
    return {
      maxGuides: FREE_PLAN_MAX_GUIDES,
      maxStays: FREE_PLAN_MAX_STAYS,
      features
    };
  }
  return {
    maxGuides: null,
    maxStays: null,
    features
  };
}

/**
 * @param {PlanTier | string | null | undefined} plan
 * @param {'bins' | 'smartHome' | 'weather'} feature
 */
export function planFeatureEnabled(plan, feature) {
  const features = planFeatures(normalizePlanTier(plan));
  return Boolean(features[feature]);
}

/**
 * Soft-limit state for Free plan usage (block new creates at cap; keep existing over cap).
 *
 * @param {PlanTier | string | null | undefined} plan
 * @param {{ guides?: number, stays?: number } | null | undefined} usage
 */
export function planLimitState(plan, usage) {
  const limits = planLimits(normalizePlanTier(plan));
  const guides = Number(usage?.guides ?? 0);
  const stays = Number(usage?.stays ?? 0);
  return {
    atGuideLimit: limits.maxGuides != null && guides >= limits.maxGuides,
    atStayLimit: limits.maxStays != null && stays >= limits.maxStays,
    overGuideLimit: limits.maxGuides != null && guides > limits.maxGuides,
    overStayLimit: limits.maxStays != null && stays > limits.maxStays
  };
}

/**
 * @param {{ plan_tier?: string | null, status?: string | null } | null | undefined} row
 * @returns {PlanTier}
 */
export function planTierFromBillingRow(row) {
  const raw = String(row?.plan_tier ?? '').trim().toLowerCase();
  if (raw === 'free') return 'free';
  if (raw === 'plus') return 'plus';
  return 'plus';
}

/**
 * Account page URL for upgrading an existing Free hub to Lovely Home+.
 *
 * @param {Record<string, string | undefined>} [env]
 * @param {string | null | undefined} siteId
 */
export function accountUpgradeUrl(env = {}, siteId) {
  const base = marketingSiteOrigin(env);
  const normalized = String(siteId ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return `${base}/account`;
  return `${base}/account?upgrade=${encodeURIComponent(normalized)}`;
}

/**
 * Account page URL for downgrading an existing Plus hub to Free.
 *
 * @param {Record<string, string | undefined>} [env]
 * @param {string | null | undefined} siteId
 */
export function accountDowngradeUrl(env = {}, siteId) {
  const base = marketingSiteOrigin(env);
  const normalized = String(siteId ?? '')
    .trim()
    .toLowerCase();
  if (!normalized) return `${base}/account`;
  return `${base}/account?downgrade=${encodeURIComponent(normalized)}`;
}

/**
 * Public hub plan payload for owner UI and worker limit checks.
 *
 * @param {{ plan_tier?: string | null, status?: string | null, trial_end?: number | null } | null | undefined} row
 * @param {number} [nowMs]
 * @param {{ env?: Record<string, string | undefined>; siteId?: string | null }} [options]
 */
export function buildPublicHubPlanStatus(row, nowMs = Date.now(), options = {}) {
  const status = String(row?.status ?? '');
  const trialEnd = row?.trial_end == null ? null : Number(row.trial_end);
  const trialEndMs = Number.isFinite(trialEnd) && trialEnd > 0 ? trialEnd : null;
  const trialing = status === 'trialing' && (trialEndMs == null || trialEndMs > nowMs);
  const plan = planTierFromBillingRow(row);
  const limits = planLimits(plan);
  const planLabel = plan === 'free' ? 'Free' : 'Lovely Home+';
  const accountUrl = `${marketingSiteOrigin(options.env ?? {})}/account`;

  return {
    plan,
    planLabel,
    limits,
    guidesExplainer: plan === 'free' ? FREE_PLAN_GUIDES_EXPLAINER : null,
    trialing,
    trialEnd: trialing ? trialEndMs : null,
    upgradeUrl: plan === 'free' ? accountUpgradeUrl(options.env, options.siteId) : accountUrl,
    downgradeUrl: plan === 'plus' ? accountDowngradeUrl(options.env, options.siteId) : null,
    accountUrl
  };
}
