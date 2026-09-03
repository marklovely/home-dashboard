import { getSiteFromManifest } from './platformApi.js';

/** Twelve-month hold on a hub name after subscription cancel (customer-facing: "hub name", not slug). */
export const HUB_NAME_HOLD_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * @param {number} [nowMs]
 */
export function hubNameHeldUntil(nowMs = Date.now()) {
  return nowMs + HUB_NAME_HOLD_MS;
}

/**
 * @param {{ slug_held_until?: number | null } | null | undefined} billingRow
 * @param {number} [nowMs]
 */
export function isHubNameHeld(billingRow, nowMs = Date.now()) {
  const heldUntil = billingRow?.slug_held_until;
  return typeof heldUntil === 'number' && heldUntil > nowMs;
}

/**
 * @param {string | null | undefined} a
 * @param {string | null | undefined} b
 */
export function ownerEmailMatchesBilling(a, b) {
  const left = String(a ?? '').trim().toLowerCase();
  const right = String(b ?? '').trim().toLowerCase();
  return Boolean(left && right && left === right);
}

/**
 * Original owner reclaiming a hub name after cancel/deprovision (not a first-time signup).
 *
 * @param {{
 *   status?: string | null;
 *   owner_email?: string | null;
 *   slug_held_until?: number | null;
 *   deprovision_dispatched_at?: number | null;
 *   archive_r2_key?: string | null;
 * } | null | undefined} existingBilling
 * @param {object} manifest
 * @param {string} siteId
 * @param {string | null | undefined} ownerEmail
 */
export function isHubReclaimSignup(existingBilling, manifest, siteId, ownerEmail) {
  if (!existingBilling) return false;
  if (getSiteFromManifest(manifest, siteId)) return false;
  if (!ownerEmailMatchesBilling(ownerEmail, existingBilling.owner_email)) return false;

  const status = String(existingBilling.status ?? '');
  if (status === 'canceled') return true;
  if (existingBilling.deprovision_dispatched_at) return true;
  if (isHubNameHeld(existingBilling)) return true;
  if (String(existingBilling.archive_r2_key ?? '').trim()) return true;

  return false;
}

/**
 * @param {string} siteId
 * @param {number} heldUntilMs
 */
export function hubNameHeldReason(siteId, heldUntilMs) {
  const until = new Date(heldUntilMs).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  return `The hub name "${siteId}.lovely-hub.com" was used recently and cannot be chosen again until ${until}. Try another name.`;
}

/**
 * @param {D1Database} db
 * @param {string} siteId
 * @param {number} [nowMs]
 */
export async function applyHubNameHoldAfterCancel(db, siteId, nowMs = Date.now()) {
  const heldUntil = hubNameHeldUntil(nowMs);
  await db
    .prepare(
      `UPDATE site_billing
       SET slug_held_until = CASE
         WHEN slug_held_until IS NULL OR slug_held_until < ? THEN ?
         ELSE slug_held_until
       END,
       updated_at = ?
       WHERE site_id = ?`
    )
    .bind(heldUntil, heldUntil, nowMs, siteId)
    .run();
}
