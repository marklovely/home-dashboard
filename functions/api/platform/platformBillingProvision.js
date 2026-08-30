import { validateBillingSiteId } from './platformBilling.js';
import { dispatchSiteProvisionWorkflow } from './platformGitHub.js';
import { getSiteFromManifest } from './platformApi.js';

/** Sites that must never be auto-provisioned from billing webhooks. */
export const BILLING_PROVISION_BLOCKED_SITE_IDS = new Set(['production', 'demo']);

/** @type {readonly string[]} */
export const BILLING_PROVISION_TRIGGER_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created'
];

/**
 * @param {Record<string, unknown> | null | undefined} manifestSite
 */
export function siteHasTerraformContract(manifestSite) {
  const contract = manifestSite?.contract;
  if (!contract || typeof contract !== 'object') return false;
  const d1 =
    /** @type {Record<string, unknown>} */ (contract).d1_database_id ??
    /** @type {Record<string, unknown>} */ (contract).d1DatabaseId;
  return Boolean(String(d1 ?? '').trim());
}

/**
 * @param {{
 *   eventType: string;
 *   status: string;
 *   siteId: string;
 *   existingBilling?: { provision_dispatched_at?: number | null } | null;
 *   manifestSite?: Record<string, unknown> | null;
 * }} input
 */
export function shouldDispatchBillingProvision(input) {
  const { eventType, status, siteId, existingBilling, manifestSite } = input;

  if (status !== 'trialing') {
    return { dispatch: false, reason: 'not_trialing' };
  }
  if (!BILLING_PROVISION_TRIGGER_EVENTS.includes(eventType)) {
    return { dispatch: false, reason: 'event_type' };
  }
  if (validateBillingSiteId(siteId)) {
    return { dispatch: false, reason: 'invalid_site_id' };
  }
  if (BILLING_PROVISION_BLOCKED_SITE_IDS.has(siteId)) {
    return { dispatch: false, reason: 'blocked_site' };
  }
  if (existingBilling?.provision_dispatched_at) {
    return { dispatch: false, reason: 'already_dispatched' };
  }
  if (!manifestSite) {
    return { dispatch: false, reason: 'site_not_in_manifest' };
  }
  if (siteHasTerraformContract(manifestSite)) {
    return { dispatch: false, reason: 'already_provisioned' };
  }
  return { dispatch: true, reason: 'trialing_needs_provision' };
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 */
export async function markProvisionDispatched(db, siteId) {
  await db
    .prepare(
      `UPDATE site_billing
       SET provision_dispatched_at = ?, provision_last_error = NULL, updated_at = ?
       WHERE site_id = ?`
    )
    .bind(Date.now(), Date.now(), siteId)
    .run();
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 * @param {string} message
 */
export async function markProvisionFailed(db, siteId, message) {
  await db
    .prepare(
      `UPDATE site_billing
       SET provision_last_error = ?, updated_at = ?
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
 *   existingBilling?: { provision_dispatched_at?: number | null } | null;
 * }} input
 */
export async function maybeDispatchBillingProvision(env, db, manifest, input) {
  const manifestSite = getSiteFromManifest(manifest, input.siteId);
  const decision = shouldDispatchBillingProvision({
    eventType: input.eventType,
    status: input.status,
    siteId: input.siteId,
    existingBilling: input.existingBilling,
    manifestSite
  });

  if (!decision.dispatch) {
    return { ok: true, action: `provision_${decision.reason}` };
  }

  const dispatch = await dispatchSiteProvisionWorkflow(
    /** @type {Record<string, string | undefined>} */ (env),
    input.siteId
  );

  if (!dispatch.ok) {
    const message = dispatch.message ?? dispatch.error ?? 'Provision dispatch failed.';
    await markProvisionFailed(db, input.siteId, message);
    return {
      ok: false,
      error: 'PROVISION_DISPATCH_FAILED',
      message,
      provisionReason: decision.reason
    };
  }

  await markProvisionDispatched(db, input.siteId);
  return {
    ok: true,
    action: 'provision_dispatched',
    workflow: dispatch.workflow,
    message: dispatch.message
  };
}
