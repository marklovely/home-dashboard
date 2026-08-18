/**
 * Shared validation for platform site registry entries.
 */

import { validateEmailList } from './email-lists.mjs';

/** @typedef {'create' | 'update' | 'delete'} SiteAction */

/** @typedef {object} SiteRegistryEntry
 * @property {string} hostname
 * @property {string} hub_environment
 * @property {boolean} vanilla
 * @property {boolean} [terraform]
 * @property {boolean} [attach_hub_api_binding]
 * @property {string[]} [owner_emails]
 * @property {string[]} [sitter_emails]
 */

const SITE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;
const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** Sites that cannot be removed from the platform UI. */
export const PROTECTED_SITE_IDS = new Set(['production']);

/**
 * @param {string} siteId
 */
export function validateSiteId(siteId) {
  const id = String(siteId ?? '').trim();
  if (!id) return 'Site id is required.';
  if (!SITE_ID_RE.test(id)) {
    return 'Site id must start with a letter and use lowercase letters, numbers, hyphens, or underscores (max 32 chars).';
  }
  return null;
}

/**
 * @param {string} hostname
 * @param {string} [zoneName]
 */
export function validateHostname(hostname, zoneName = 'lovely-home.co.uk') {
  const host = String(hostname ?? '').trim().toLowerCase();
  if (!host) return 'Hostname is required.';
  if (!HOSTNAME_RE.test(host)) return 'Hostname must be a valid DNS name.';
  if (!host.endsWith(`.${zoneName}`) && host !== zoneName) {
    return `Hostname must be under ${zoneName}.`;
  }
  return null;
}

/**
 * @param {SiteAction} action
 * @param {string} siteId
 * @param {Partial<SiteRegistryEntry>} payload
 * @param {Record<string, SiteRegistryEntry>} existing
 * @param {{ zoneName?: string }} [options]
 */
export function validateSiteMutation(action, siteId, payload, existing, options = {}) {
  const zoneName = options.zoneName ?? 'lovely-home.co.uk';
  const idError = validateSiteId(siteId);
  if (idError) return idError;

  if (action === 'create') {
    if (existing[siteId]) return `Site "${siteId}" already exists in the registry.`;
    const hostError = validateHostname(payload.hostname, zoneName);
    if (hostError) return hostError;
    const ownerError = validateEmailList(payload.owner_emails, { required: true });
    if (ownerError) return ownerError;
    const sitterError = validateEmailList(payload.sitter_emails);
    if (sitterError) return sitterError;
    return null;
  }

  if (action === 'update') {
    if (!existing[siteId]) return `Site "${siteId}" is not in the registry.`;
    if (payload.hostname !== undefined) {
      const hostError = validateHostname(payload.hostname, zoneName);
      if (hostError) return hostError;
    }
    if (payload.owner_emails !== undefined) {
      const ownerError = validateEmailList(payload.owner_emails, { required: true });
      if (ownerError) return ownerError;
    }
    const sitterError = validateEmailList(payload.sitter_emails);
    if (sitterError) return sitterError;
    return null;
  }

  if (action === 'delete') {
    if (!existing[siteId]) return `Site "${siteId}" is not in the registry.`;
    if (PROTECTED_SITE_IDS.has(siteId)) {
      return `Site "${siteId}" is protected and cannot be deleted from the platform UI.`;
    }
    return null;
  }

  return 'Unknown action.';
}

/**
 * @param {string} siteId
 * @param {Partial<SiteRegistryEntry>} payload
 * @param {string} [zoneName]
 */
export function defaultSiteEntry(siteId, payload, zoneName = 'lovely-home.co.uk') {
  const hostname =
    payload.hostname?.trim() ||
    (siteId === 'production' ? `dashboard.${zoneName}` : `${siteId}.${zoneName}`);
  return {
    hostname,
    hub_environment: payload.hub_environment?.trim() || siteId,
    vanilla: payload.vanilla !== false,
    terraform: payload.terraform !== false,
    attach_hub_api_binding: payload.attach_hub_api_binding === true
  };
}

/**
 * @param {string} siteId
 * @param {SiteRegistryEntry} entry
 */
export function suggestedPagesProject(siteId) {
  return siteId === 'production' ? 'home-dashboard' : `home-dashboard-${siteId}`;
}

/**
 * @param {string} siteId
 */
export function suggestedWorkerName(siteId) {
  return siteId === 'production' ? 'lovely-home-hub-api' : `lovely-home-hub-api-${siteId}`;
}

/**
 * Validate site id for worker deploy workflows (blocks production and invalid ids).
 *
 * @param {string} siteId
 */
export function validateDeploySiteId(siteId) {
  const idError = validateSiteId(siteId);
  if (idError) return idError;
  if (PROTECTED_SITE_IDS.has(siteId)) {
    return 'Production worker deploy is not supported via this workflow.';
  }
  return null;
}

/**
 * Validate site id for automated deprovision (site removed from registry, still in TF state).
 *
 * @param {string} siteId
 * @param {Record<string, SiteRegistryEntry>} registrySites
 */
export function validateDeprovisionSiteId(siteId, registrySites) {
  const idError = validateSiteId(siteId);
  if (idError) return idError;
  if (PROTECTED_SITE_IDS.has(siteId)) {
    return `Site "${siteId}" is protected and cannot be deprovisioned.`;
  }
  if (registrySites[siteId]) {
    return `Site "${siteId}" is still in platform/sites.yaml — merge the delete PR first.`;
  }
  return null;
}
