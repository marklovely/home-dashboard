/**
 * Paid-signup job for a new hub.
 *
 * The public signup endpoint deliberately does not touch git: it only opens a
 * Stripe Checkout session. Once Stripe confirms the subscription, this module
 * enqueues a Cloudflare Queue message. The hub-jobs Worker dispatches
 * Terraform/Worker/Pages in GitHub Actions. Git (sites.yaml) is recorded after
 * the hub is live, by the concurrency-1 registry queue.
 *
 * The customer's email is *not* written into git. It lives in the platform
 * billing database and is read at provision time.
 */
import { validateBillingSiteId } from './platformBilling.js';
import { enqueueHubProvisionJob } from './platformHubQueues.js';
import { getSiteFromManifest } from './platformApi.js';
import { BILLING_PROVISION_BLOCKED_SITE_IDS } from './platformBillingProvision.js';

/** Events that prove a subscription exists and may create a hub. */
export const REGISTRY_TRIGGER_EVENTS = ['checkout.session.completed', 'customer.subscription.created'];

/**
 * @param {{
 *   eventType: string;
 *   status: string;
 *   siteId: string;
 *   existingBilling?: { registry_dispatched_at?: number | null } | null;
 *   manifestSite?: Record<string, unknown> | null;
 * }} input
 */
export function shouldDispatchSignupRegistry(input) {
  const { eventType, status, siteId, existingBilling, manifestSite } = input;

  if (status !== 'trialing' && status !== 'active') {
    return { dispatch: false, reason: 'not_paid' };
  }
  if (!REGISTRY_TRIGGER_EVENTS.includes(eventType)) {
    return { dispatch: false, reason: 'event_type' };
  }
  if (validateBillingSiteId(siteId)) {
    return { dispatch: false, reason: 'invalid_site_id' };
  }
  if (BILLING_PROVISION_BLOCKED_SITE_IDS.has(siteId)) {
    return { dispatch: false, reason: 'blocked_site' };
  }
  if (manifestSite) {
    return { dispatch: false, reason: 'already_registered' };
  }
  if (existingBilling?.registry_dispatched_at) {
    return { dispatch: false, reason: 'already_dispatched' };
  }
  return { dispatch: true, reason: 'paid_needs_registry' };
}

/**
 * @param {{ meta?: { changes?: number | null } } | null | undefined} result
 */
export function d1UpdateChangedRow(result) {
  return Number(result?.meta?.changes ?? 0) > 0;
}

/**
 * Claim the registry-dispatch lock before enqueueing provision.
 * Stripe sends checkout.session.completed and customer.subscription.created
 * together; a read of registry_dispatched_at is not enough — both handlers
 * would see null and enqueue twice. Only one UPDATE can win.
 *
 * @param {D1Database} db
 * @param {string} siteId
 */
export async function claimRegistryDispatch(db, siteId) {
  const now = Date.now();
  const result = await db
    .prepare(
      `UPDATE site_billing
       SET registry_dispatched_at = ?, registry_last_error = NULL, updated_at = ?
       WHERE site_id = ? AND registry_dispatched_at IS NULL`
    )
    .bind(now, now, siteId)
    .run();
  return d1UpdateChangedRow(result);
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 * @param {string} message
 */
export async function markRegistryFailed(db, siteId, message) {
  await db
    .prepare(
      `UPDATE site_billing
       SET registry_dispatched_at = NULL, registry_last_error = ?, updated_at = ?
       WHERE site_id = ?`
    )
    .bind(message.slice(0, 500), Date.now(), siteId)
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
 *   existingBilling?: { registry_dispatched_at?: number | null } | null;
 * }} input
 */
export async function maybeDispatchSignupRegistry(env, db, manifest, input) {
  const manifestSite = getSiteFromManifest(manifest, input.siteId);
  const decision = shouldDispatchSignupRegistry({
    eventType: input.eventType,
    status: input.status,
    siteId: input.siteId,
    existingBilling: input.existingBilling,
    manifestSite
  });

  if (!decision.dispatch) {
    return { ok: true, action: `registry_${decision.reason}` };
  }

  const claimed = await claimRegistryDispatch(db, input.siteId);
  if (!claimed) {
    return { ok: true, action: 'registry_already_dispatched' };
  }

  const enqueue = await enqueueHubProvisionJob(env, {
    siteId: input.siteId,
    action: 'provision'
  });
  if (!enqueue.ok) {
    const message = enqueue.message ?? enqueue.error ?? 'Provision enqueue failed.';
    await markRegistryFailed(db, input.siteId, message);
    return { ok: false, error: enqueue.error ?? 'REGISTRY_DISPATCH_FAILED', message };
  }

  return {
    ok: true,
    action: 'registry_dispatched',
    queue: enqueue.queue,
    message: `Enqueued hub provision for ${input.siteId}.`
  };
}
