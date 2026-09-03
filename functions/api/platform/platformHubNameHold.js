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
