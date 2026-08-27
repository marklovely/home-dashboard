/** @typedef {import('./site-registry.mjs').SiteRegistryEntry} SiteRegistryEntry */

/** Marketing site and internal platform hubs (demo, sandbox, platform admin). */
export const PLATFORM_ZONE_NAME = 'lovely-home.co.uk';

/** Per-household customer hub hostnames: `{site-id}.lovely-hub.com`. */
export const CUSTOMER_HUB_ZONE_NAME = 'lovely-hub.com';

/** @type {readonly string[]} */
export const ALLOWED_HUB_ZONE_NAMES = [PLATFORM_ZONE_NAME, CUSTOMER_HUB_ZONE_NAME];

/**
 * @param {string} hostname
 * @param {readonly string[]} [allowedZones]
 */
export function hostnameMatchesAllowedZone(hostname, allowedZones = ALLOWED_HUB_ZONE_NAMES) {
  const host = String(hostname ?? '').trim().toLowerCase();
  return allowedZones.some((zone) => host === zone || host.endsWith(`.${zone}`));
}

/**
 * @param {string} hostname
 * @param {readonly string[]} [allowedZones]
 */
export function zoneNameForHostname(hostname, allowedZones = ALLOWED_HUB_ZONE_NAMES) {
  const host = String(hostname ?? '').trim().toLowerCase();
  return allowedZones.find((zone) => host === zone || host.endsWith(`.${zone}`)) ?? null;
}

/**
 * Default hostname for a new site id under the given zone.
 * @param {string} siteId
 * @param {string} zoneName
 */
export function defaultHostnameForSite(siteId, zoneName) {
  if (siteId === 'production') return `dashboard.${PLATFORM_ZONE_NAME}`;
  return `${siteId}.${zoneName}`;
}

/**
 * @param {string} siteId
 * @param {Partial<SiteRegistryEntry>} payload
 * @param {string} [fallbackZoneName]
 */
export function resolveSiteZoneName(siteId, payload, fallbackZoneName = PLATFORM_ZONE_NAME) {
  const fromPayload = String(payload.zone_name ?? '').trim();
  if (fromPayload) return fromPayload;
  if (siteId === 'production' || siteId === 'demo') return PLATFORM_ZONE_NAME;
  const hostZone = payload.hostname ? zoneNameForHostname(payload.hostname) : null;
  if (hostZone) return hostZone;
  return fallbackZoneName;
}

/**
 * @param {string} hostname
 * @param {readonly string[]} [allowedZones]
 */
export function validateHubHostname(hostname, allowedZones = ALLOWED_HUB_ZONE_NAMES) {
  const host = String(hostname ?? '').trim().toLowerCase();
  const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!host) return 'Hostname is required.';
  if (!HOSTNAME_RE.test(host)) return 'Hostname must be a valid DNS name.';
  if (!hostnameMatchesAllowedZone(host, allowedZones)) {
    return `Hostname must be under ${allowedZones.join(' or ')}.`;
  }
  return null;
}
