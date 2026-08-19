import { PROTECTED_SITE_IDS, validateSiteId } from './site-registry.mjs';

/**
 * Site ids added between two registry snapshots (terraform-managed sites only).
 *
 * @param {Record<string, Record<string, string | boolean>>} before
 * @param {Record<string, Record<string, string | boolean>>} after
 * @returns {string[]}
 */
export function detectAddedTerraformSites(before, after) {
  /** @type {string[]} */
  const added = [];
  for (const siteId of Object.keys(after)) {
    if (before[siteId]) continue;
    if (after[siteId]?.terraform === false) continue;
    if (validateSiteId(siteId)) continue;
    added.push(siteId);
  }
  return added;
}

/**
 * Site ids removed between two registry snapshots (terraform-managed sites only).
 *
 * @param {Record<string, Record<string, string | boolean>>} before
 * @param {Record<string, Record<string, string | boolean>>} after
 * @returns {string[]}
 */
export function detectRemovedTerraformSites(before, after) {
  /** @type {string[]} */
  const removed = [];
  for (const siteId of Object.keys(before)) {
    if (after[siteId]) continue;
    if (before[siteId]?.terraform === false) continue;
    if (PROTECTED_SITE_IDS.has(siteId)) continue;
    if (validateSiteId(siteId)) continue;
    removed.push(siteId);
  }
  return removed;
}
