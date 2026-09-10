import { getSiteBilling, stripeApiRequest, upsertSiteBilling } from './platformBilling.js';
import { resolvePlanTierFromSubscription } from './platformPlanTier.js';
import { getStripeMode, stripeCredentialsForMode } from './platformStripeMode.js';

/**
 * Backfill plan_tier for rows created before the column existed.
 *
 * @param {Record<string, string | undefined>} env
 * @param {D1Database} db
 * @param {import('./platformBilling.js').SiteBillingRow | null} row
 */
export async function resolveBillingRowPlanTier(env, db, row) {
  if (!row?.site_id || !row.stripe_subscription_id) return row;
  if (row.plan_tier === 'free' || row.plan_tier === 'plus') return row;

  const mode = await getStripeMode(db);
  const secretKey = stripeCredentialsForMode(env, mode).secretKey;
  if (!secretKey) return row;

  try {
    const subscription = await stripeApiRequest(
      secretKey,
      'GET',
      `/subscriptions/${encodeURIComponent(String(row.stripe_subscription_id))}`
    );
    const tier = resolvePlanTierFromSubscription(env, mode, subscription);
    if (!tier) return row;
    await upsertSiteBilling(db, {
      site_id: row.site_id,
      stripe_customer_id: String(row.stripe_customer_id ?? ''),
      stripe_subscription_id: row.stripe_subscription_id,
      status: row.status ?? 'active',
      trial_end: row.trial_end ?? null,
      owner_email: row.owner_email ?? null,
      plan_tier: tier
    });
    return { ...row, plan_tier: tier };
  } catch {
    return row;
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {D1Database | null} db
 * @param {string} siteId
 */
export async function getSiteBillingWithPlanTier(env, db, siteId) {
  if (!db) return null;
  const row = await getSiteBilling(db, siteId);
  if (!row) return null;
  return resolveBillingRowPlanTier(env, db, row);
}
