import { resolveStripeFreePriceId } from './platformBilling.js';

/** @typedef {'free' | 'plus'} PlanTier */

export const FREE_PLAN_MAX_GUIDES = 2;
export const FREE_PLAN_MAX_STAYS = 2;

/**
 * @param {PlanTier | string | null | undefined} tier
 */
export function normalizePlanTier(tier) {
  return String(tier ?? '').trim().toLowerCase() === 'free' ? 'free' : 'plus';
}

/**
 * @param {unknown} subscription
 * @returns {string | null}
 */
export function stripeSubscriptionPriceId(subscription) {
  const sub = /** @type {{ items?: { data?: Array<{ price?: { id?: string } }> } }} */ (subscription ?? {});
  const priceId = sub.items?.data?.[0]?.price?.id;
  return priceId ? String(priceId) : null;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'test' | 'live'} mode
 * @param {string | null | undefined} priceId
 * @returns {PlanTier | null}
 */
export function resolvePlanTierFromPriceId(env, mode, priceId) {
  const id = String(priceId ?? '').trim();
  if (!id) return null;
  const freeId = resolveStripeFreePriceId(env, mode);
  if (freeId && id === freeId) return 'free';
  return 'plus';
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {'test' | 'live'} mode
 * @param {unknown} subscription
 * @returns {PlanTier | null}
 */
export function resolvePlanTierFromSubscription(env, mode, subscription) {
  return resolvePlanTierFromPriceId(env, mode, stripeSubscriptionPriceId(subscription));
}

/**
 * @param {PlanTier} plan
 */
export function planLimits(plan) {
  if (plan === 'free') {
    return {
      maxGuides: FREE_PLAN_MAX_GUIDES,
      maxStays: FREE_PLAN_MAX_STAYS
    };
  }
  return {
    maxGuides: null,
    maxStays: null
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
 * Public hub plan payload for owner UI and worker limit checks.
 *
 * @param {{ plan_tier?: string | null, status?: string | null, trial_end?: number | null } | null | undefined} row
 * @param {number} [nowMs]
 */
export function buildPublicHubPlanStatus(row, nowMs = Date.now()) {
  const status = String(row?.status ?? '');
  const trialEnd = row?.trial_end == null ? null : Number(row.trial_end);
  const trialEndMs = Number.isFinite(trialEnd) && trialEnd > 0 ? trialEnd : null;
  const trialing = status === 'trialing' && (trialEndMs == null || trialEndMs > nowMs);
  const plan = planTierFromBillingRow(row);
  const limits = planLimits(plan);
  const planLabel = plan === 'free' ? 'Free' : 'Lovely Home+';

  return {
    plan,
    planLabel,
    limits,
    trialing,
    trialEnd: trialing ? trialEndMs : null,
    upgradeUrl: 'https://lovely-home.co.uk/pricing',
    accountUrl: 'https://lovely-home.co.uk/account'
  };
}
