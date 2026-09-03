import { siteHasTerraformContract } from './platformBillingProvision.js';

/**
 * Whether the site is in a paid/trial billing state (hub should stay or come live).
 *
 * @param {string | undefined | null} status
 */
export function isLiveBillingStatus(status) {
  return status === 'trialing' || status === 'active' || status === 'past_due';
}

/**
 * Decide whether a new Stripe subscription cycle should clear prior dispatch flags.
 * Covers: re-trial on the same site_id after deprovision, resume from canceled, new sub id.
 *
 * @param {{
 *   status: string;
 *   subscriptionId?: string | null;
 *   existingBilling?: {
 *     status?: string;
 *     stripe_subscription_id?: string | null;
 *     deprovision_dispatched_at?: number | null;
 *     provision_dispatched_at?: number | null;
 *   } | null;
 *   manifestSite?: Record<string, unknown> | null;
 * }} input
 */
export function shouldResetBillingCycleFlags(input) {
  const { status, subscriptionId, existingBilling, manifestSite } = input;
  if (!isLiveBillingStatus(status) || !existingBilling) {
    return { reset: false, clearDeprovision: false, clearProvision: false, reason: 'not_live_cycle' };
  }

  const prevStatus = String(existingBilling.status ?? '');
  const prevSubId = String(existingBilling.stripe_subscription_id ?? '').trim();
  const nextSubId = String(subscriptionId ?? '').trim();
  const subscriptionChanged = Boolean(nextSubId && prevSubId && nextSubId !== prevSubId);
  const resumedFromCanceled = prevStatus === 'canceled';
  const hadDeprovision = Boolean(existingBilling.deprovision_dispatched_at);
  const hadProvision = Boolean(existingBilling.provision_dispatched_at);
  const siteNeedsInfra = !siteHasTerraformContract(manifestSite);

  const clearDeprovision = hadDeprovision && (resumedFromCanceled || subscriptionChanged || isLiveBillingStatus(prevStatus));
  const clearProvision =
    siteNeedsInfra && hadProvision && (resumedFromCanceled || subscriptionChanged || hadDeprovision);

  if (!clearDeprovision && !clearProvision) {
    return { reset: false, clearDeprovision: false, clearProvision: false, reason: 'flags_current' };
  }

  return {
    reset: true,
    clearDeprovision,
    clearProvision,
    reason: 'new_billing_cycle'
  };
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 * @param {{ clearDeprovision: boolean; clearProvision: boolean }} flags
 */
export async function resetBillingCycleFlags(db, siteId, flags) {
  if (!flags.clearDeprovision && !flags.clearProvision) return;

  const sets = ['updated_at = ?'];
  /** @type {unknown[]} */
  const values = [Date.now()];

  if (flags.clearDeprovision) {
    sets.push('deprovision_dispatched_at = NULL', 'deprovision_last_error = NULL', 'slug_held_until = NULL');
  }
  if (flags.clearProvision) {
    sets.push('provision_dispatched_at = NULL', 'provision_last_error = NULL');
  }

  values.push(siteId);
  await db
    .prepare(`UPDATE site_billing SET ${sets.join(', ')} WHERE site_id = ?`)
    .bind(...values)
    .run();
}

/**
 * Deprovision may run again when the hub was live after a prior teardown dispatch
 * (re-trial / new subscription on the same site_id).
 *
 * @param {{
 *   existingBilling?: {
 *     status?: string;
 *     deprovision_dispatched_at?: number | null;
 *   } | null;
 * }} input
 */
export function priorDeprovisionBlocksDispatch(input) {
  if (!input.existingBilling?.deprovision_dispatched_at) {
    return false;
  }
  return !isLiveBillingStatus(String(input.existingBilling.status ?? ''));
}
