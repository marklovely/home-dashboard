import { validateBillingSiteId } from './platformBilling.js';
import { enqueueHubProvisionJob } from './platformHubQueues.js';
import { getSiteFromManifest } from './platformApi.js';
import { siteHasTerraformContract } from './platformBillingProvision.js';
import { priorDeprovisionBlocksDispatch } from './platformBillingLifecycle.js';
import { applyHubNameHoldAfterCancel } from './platformHubNameHold.js';

/** Sites that must never be auto-deprovisioned from billing webhooks. */
export const BILLING_DEPROVISION_BLOCKED_SITE_IDS = new Set(['production', 'demo']);

/** @type {readonly string[]} */
export const BILLING_DEPROVISION_TRIGGER_EVENTS = [
  'customer.subscription.deleted',
  'customer.subscription.updated'
];

/**
 * @param {{
 *   eventType: string;
 *   status: string;
 *   siteId: string;
 *   existingBilling?: {
 *     status?: string;
 *     provision_dispatched_at?: number | null;
 *     deprovision_dispatched_at?: number | null;
 *   } | null;
 *   manifestSite?: Record<string, unknown> | null;
 * }} input
 */
export function shouldDispatchBillingDeprovision(input) {
  const { eventType, status, siteId, existingBilling, manifestSite } = input;

  if (status !== 'canceled') {
    return { dispatch: false, reason: 'not_canceled' };
  }
  if (!BILLING_DEPROVISION_TRIGGER_EVENTS.includes(eventType)) {
    return { dispatch: false, reason: 'event_type' };
  }
  if (validateBillingSiteId(siteId)) {
    return { dispatch: false, reason: 'invalid_site_id' };
  }
  if (BILLING_DEPROVISION_BLOCKED_SITE_IDS.has(siteId)) {
    return { dispatch: false, reason: 'blocked_site' };
  }
  if (priorDeprovisionBlocksDispatch({ existingBilling })) {
    return { dispatch: false, reason: 'already_dispatched' };
  }
  if (
    eventType === 'customer.subscription.updated' &&
    existingBilling?.status === 'canceled'
  ) {
    return { dispatch: false, reason: 'already_canceled' };
  }
  const wasLive =
    siteHasTerraformContract(manifestSite) ||
    Boolean(existingBilling?.provision_dispatched_at) ||
    ['trialing', 'active', 'past_due'].includes(String(existingBilling?.status ?? ''));
  if (!wasLive) {
    return {
      dispatch: false,
      reason: manifestSite ? 'never_provisioned' : 'site_not_in_manifest'
    };
  }
  return { dispatch: true, reason: 'canceled_needs_deprovision' };
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 */
export async function markDeprovisionDispatched(db, siteId) {
  const now = Date.now();
  await db
    .prepare(
      `UPDATE site_billing
       SET deprovision_dispatched_at = ?, deprovision_last_error = NULL, updated_at = ?
       WHERE site_id = ?`
    )
    .bind(now, now, siteId)
    .run();
  await applyHubNameHoldAfterCancel(db, siteId, now);
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 * @param {string} message
 */
export async function markDeprovisionFailed(db, siteId, message) {
  await db
    .prepare(
      `UPDATE site_billing
       SET deprovision_last_error = ?, updated_at = ?
       WHERE site_id = ?`
    )
    .bind(message.slice(0, 500), Date.now(), siteId)
    .run();
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 * @param {string} archiveR2Key
 */
export async function markBillingArchiveKey(db, siteId, archiveR2Key) {
  if (!archiveR2Key.trim()) return;
  await db
    .prepare(
      `UPDATE site_billing
       SET archive_r2_key = ?, updated_at = ?
       WHERE site_id = ?`
    )
    .bind(archiveR2Key.trim(), Date.now(), siteId)
    .run();
}

/**
 * @param {Record<string, unknown>} env
 * @param {D1Database} db
 * @param {object} manifest
 * @param {{
 *   siteId: string;
 *   eventType: string;
 *   status: string;
 *   existingBilling?: {
 *     status?: string;
 *     provision_dispatched_at?: number | null;
 *     deprovision_dispatched_at?: number | null;
 *   } | null;
 * }} input
 */
export async function maybeDispatchBillingDeprovision(env, db, manifest, input) {
  const manifestSite = getSiteFromManifest(manifest, input.siteId);
  const decision = shouldDispatchBillingDeprovision({
    eventType: input.eventType,
    status: input.status,
    siteId: input.siteId,
    existingBilling: input.existingBilling,
    manifestSite
  });

  if (!decision.dispatch) {
    return { ok: true, action: `deprovision_${decision.reason}` };
  }

  const enqueue = await enqueueHubProvisionJob(env, {
    siteId: input.siteId,
    action: 'teardown'
  });

  if (!enqueue.ok) {
    const message = enqueue.message ?? enqueue.error ?? 'Deprovision enqueue failed.';
    await markDeprovisionFailed(db, input.siteId, message);
    return {
      ok: false,
      error: enqueue.error ?? 'DEPROVISION_DISPATCH_FAILED',
      message,
      deprovisionReason: decision.reason
    };
  }

  await markDeprovisionDispatched(db, input.siteId);
  return {
    ok: true,
    action: 'deprovision_dispatched',
    queue: enqueue.queue,
    message: `Enqueued hub teardown for ${input.siteId}.`
  };
}
