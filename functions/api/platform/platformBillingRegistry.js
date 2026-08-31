/**
 * Registry creation for paid signups.
 *
 * The public signup endpoint deliberately does not touch the registry: it only
 * opens a Stripe Checkout session. This module creates the `platform/sites.yaml`
 * entry once Stripe confirms the subscription, so provisioning can never run
 * for an abandoned or hostile signup.
 *
 * The customer's email is *not* written into the payload. It lives in the
 * platform billing database and is read at provision time, keeping personal
 * data out of the public repository.
 */
import { validateBillingSiteId } from './platformBilling.js';
import { buildSiteManagePayload } from './platformSiteMutations.js';
import { dispatchSiteManageWorkflow } from './platformGitHub.js';
import { getSiteFromManifest } from './platformApi.js';
import { BILLING_PROVISION_BLOCKED_SITE_IDS } from './platformBillingProvision.js';

const CUSTOMER_HUB_ZONE_NAME = 'lovely-hub.com';

/** Events that prove a subscription exists and may create a registry entry. */
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
 * Claim the registry-dispatch lock before talking to GitHub.
 * Stripe sends checkout.session.completed and customer.subscription.created
 * together; a read of registry_dispatched_at is not enough — both handlers
 * would see null and open two PRs. Only one UPDATE can win.
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
 * @param {Record<string, string | undefined>} env
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

  const built = buildSiteManagePayload(manifest, 'create', input.siteId, {
    hostname: `${input.siteId}.${CUSTOMER_HUB_ZONE_NAME}`,
    zone_name: CUSTOMER_HUB_ZONE_NAME,
    hub_environment: input.siteId,
    vanilla: false,
    terraform: true,
    attach_hub_api_binding: true
  });

  if (!built.ok) {
    const message = built.message ?? 'Could not build registry payload.';
    await markRegistryFailed(db, input.siteId, message);
    return { ok: false, error: built.error ?? 'REGISTRY_PAYLOAD_INVALID', message };
  }

  const dispatch = await dispatchSiteManageWorkflow(env, 'create', built.payload);
  if (!dispatch.ok) {
    const message = dispatch.message ?? dispatch.error ?? 'Registry dispatch failed.';
    await markRegistryFailed(db, input.siteId, message);
    return { ok: false, error: 'REGISTRY_DISPATCH_FAILED', message };
  }

  return {
    ok: true,
    action: 'registry_dispatched',
    workflow: dispatch.workflow,
    message: dispatch.message
  };
}
