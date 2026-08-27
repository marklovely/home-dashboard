/**
 * Shared validation for platform site registry entries.
 */

import { validateEmailList } from './email-lists.mjs';
import {
  ALLOWED_HUB_ZONE_NAMES,
  CUSTOMER_HUB_ZONE_NAME,
  defaultHostnameForSite,
  PLATFORM_ZONE_NAME,
  resolveSiteZoneName,
  validateHubHostname
} from './hub-zones.mjs';

/** @typedef {'create' | 'update' | 'delete'} SiteAction */

/** @typedef {object} SiteRegistryEntry
 * @property {string} hostname
 * @property {string} hub_environment
 * @property {boolean} vanilla
 * @property {boolean} [terraform]
 * @property {boolean} [attach_hub_api_binding]
 * @property {string} [zone_name]
 * @property {string[]} [owner_emails]
 * @property {string[]} [sitter_emails]
 */

const SITE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;

/** Default DNS zone when creating platform sites via CLI. */
export { PLATFORM_ZONE_NAME, CUSTOMER_HUB_ZONE_NAME, ALLOWED_HUB_ZONE_NAMES };

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
 * @param {string} [zoneName] @deprecated Pass allowed zones via validateHubHostname instead.
 */
export function validateHostname(hostname, zoneName = PLATFORM_ZONE_NAME) {
  void zoneName;
  return validateHubHostname(hostname, ALLOWED_HUB_ZONE_NAMES);
}

/**
 * @param {SiteAction} action
 * @param {string} siteId
 * @param {Partial<SiteRegistryEntry>} payload
 * @param {Record<string, SiteRegistryEntry>} existing
 * @param {{ zoneName?: string }} [options]
 */
export function validateSiteMutation(action, siteId, payload, existing, options = {}) {
  const defaultZone = options.zoneName ?? PLATFORM_ZONE_NAME;
  void defaultZone;

  const idError = validateSiteId(siteId);
  if (idError) return idError;

  if (action === 'create') {
    if (existing[siteId]) return `Site "${siteId}" already exists in the registry.`;
    const hostError = validateHubHostname(payload.hostname);
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
      const hostError = validateHubHostname(payload.hostname);
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
export function defaultSiteEntry(siteId, payload, zoneName = CUSTOMER_HUB_ZONE_NAME) {
  const resolvedZone = resolveSiteZoneName(siteId, payload, zoneName);
  const hostname = payload.hostname?.trim() || defaultHostnameForSite(siteId, resolvedZone);
  return {
    hostname,
    hub_environment: payload.hub_environment?.trim() || siteId,
    vanilla: payload.vanilla !== false,
    terraform: payload.terraform !== false,
    attach_hub_api_binding: payload.attach_hub_api_binding === true,
    ...(resolvedZone !== PLATFORM_ZONE_NAME ? { zone_name: resolvedZone } : {})
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
