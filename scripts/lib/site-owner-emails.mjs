/**
 * Site-scoped owner emails supplied at provision time.
 *
 * Customer addresses are held in the platform billing database rather than
 * `platform/sites.yaml`, so provisioning passes them to the tfvars generator
 * through the SITE_OWNER_EMAILS_JSON environment variable.
 */
import { parseEmailList } from './email-lists.mjs';

/**
 * @param {unknown} wranglerJson `wrangler d1 execute --json` output
 * @returns {string[]}
 */
export function ownerEmailsFromWranglerJson(wranglerJson) {
  const payload = Array.isArray(wranglerJson) ? wranglerJson[0] : wranglerJson;
  const rows = /** @type {{ results?: unknown }} */ (payload ?? {})?.results;
  if (!Array.isArray(rows)) return [];
  const values = rows
    .map((row) => String(/** @type {{ owner_email?: unknown }} */ (row)?.owner_email ?? '').trim())
    .filter(Boolean);
  return parseEmailList(values.join(','));
}

/**
 * @param {string} siteId
 * @param {string[]} emails
 * @returns {string} JSON map, safe to pass through an environment variable
 */
export function siteOwnerEmailsEnvValue(siteId, emails) {
  const parsed = parseEmailList(emails);
  return JSON.stringify(parsed.length ? { [siteId]: parsed } : {});
}

/**
 * @param {string | undefined} raw SITE_OWNER_EMAILS_JSON contents
 * @returns {Record<string, string[]>}
 */
export function parseSiteOwnerEmailsEnv(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return {};
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('SITE_OWNER_EMAILS_JSON is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('SITE_OWNER_EMAILS_JSON must be an object of site id → emails.');
  }
  /** @type {Record<string, string[]>} */
  const out = {};
  for (const [siteId, value] of Object.entries(parsed)) {
    const emails = parseEmailList(Array.isArray(value) ? value : String(value ?? ''));
    if (emails.length) out[siteId] = emails;
  }
  return out;
}

/**
 * Owner emails for one site: registry entry first, then the billing lookup.
 *
 * @param {string} siteId
 * @param {unknown} registryOwnerEmails
 * @param {Record<string, string[]>} billingOwnerEmails
 * @returns {string[]}
 */
export function resolveSiteOwnerEmails(siteId, registryOwnerEmails, billingOwnerEmails) {
  const fromRegistry = parseEmailList(registryOwnerEmails);
  const fromBilling = billingOwnerEmails[siteId] ?? [];
  return [...new Set([...fromRegistry, ...fromBilling])];
}
