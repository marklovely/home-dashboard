/**
 * SQL to record a hub setup failure on site_billing so the signup success
 * page can stop saying "deploying".
 */

export const HUB_SETUP_FAILED_KINDS = /** @type {const} */ (['registry', 'provision']);
const SITE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;
const MESSAGE_MAX = 500;

/**
 * @param {string} value
 */
export function escapeSqlString(value) {
  return String(value).replace(/'/g, "''");
}

/**
 * @param {string} siteId
 */
export function assertHubSetupFailedSiteId(siteId) {
  const id = String(siteId ?? '').trim().toLowerCase();
  if (!SITE_ID_RE.test(id)) {
    throw new Error('Invalid hub address.');
  }
  return id;
}

/**
 * @param {string} kind
 */
export function assertHubSetupFailedKind(kind) {
  const value = String(kind ?? '').trim();
  if (!HUB_SETUP_FAILED_KINDS.includes(/** @type {(typeof HUB_SETUP_FAILED_KINDS)[number]} */ (value))) {
    throw new Error(`Kind must be ${HUB_SETUP_FAILED_KINDS.join(' or ')}.`);
  }
  return value;
}

/**
 * @param {string} message
 */
export function clipHubSetupFailedMessage(message) {
  const text = String(message ?? '').trim() || 'Hub setup failed.';
  return text.slice(0, MESSAGE_MAX);
}

/**
 * @param {{
 *   siteId: string,
 *   kind: string,
 *   message?: string,
 *   now?: number,
 *   clear?: boolean
 * }} input
 */
export function hubSetupFailedSql(input) {
  const siteId = assertHubSetupFailedSiteId(input.siteId);
  const kind = assertHubSetupFailedKind(input.kind);
  const now = Number.isFinite(Number(input.now)) ? Number(input.now) : Date.now();
  const id = escapeSqlString(siteId);

  if (input.clear) {
    if (kind === 'registry') {
      return `UPDATE site_billing SET registry_last_error = NULL, updated_at = ${now} WHERE site_id = '${id}';`;
    }
    return `UPDATE site_billing SET provision_last_error = NULL, updated_at = ${now} WHERE site_id = '${id}';`;
  }

  const message = escapeSqlString(clipHubSetupFailedMessage(input.message));
  if (kind === 'registry') {
    return `UPDATE site_billing SET registry_dispatched_at = NULL, registry_last_error = '${message}', updated_at = ${now} WHERE site_id = '${id}';`;
  }
  return `UPDATE site_billing SET provision_last_error = '${message}', updated_at = ${now} WHERE site_id = '${id}';`;
}
