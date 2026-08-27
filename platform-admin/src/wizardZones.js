/** @typedef {{ zoneName?: string, customerZoneName?: string, defaults?: { zoneName?: string } }} WizardSchema */

export const PLATFORM_ZONE_NAME = 'lovely-home.co.uk';
export const CUSTOMER_HUB_ZONE_NAME = 'lovely-hub.com';

/** @type {readonly string[]} */
export const ALLOWED_HUB_ZONE_NAMES = [PLATFORM_ZONE_NAME, CUSTOMER_HUB_ZONE_NAME];

/**
 * DNS zone used when creating a new customer hub from the platform wizard.
 * @param {WizardSchema} [schema]
 */
export function defaultCustomerZoneName(schema) {
  return (
    schema?.customerZoneName ??
    schema?.defaults?.zoneName ??
    CUSTOMER_HUB_ZONE_NAME
  );
}

/**
 * @param {WizardSchema} [schema]
 */
export function defaultPlatformZoneName(schema) {
  return schema?.zoneName ?? PLATFORM_ZONE_NAME;
}

/**
 * @param {string} hostname
 */
export function zoneNameForHostname(hostname) {
  const host = String(hostname ?? '').trim().toLowerCase();
  return ALLOWED_HUB_ZONE_NAMES.find((zone) => host === zone || host.endsWith(`.${zone}`)) ?? null;
}

/**
 * @param {string} siteId
 * @param {string} zoneName
 */
export function hostnameForSite(siteId, zoneName) {
  const id = String(siteId ?? '').trim().toLowerCase();
  if (!id) return '';
  return `${id}.${zoneName}`;
}

/**
 * True when hostname is empty or already under one of the allowed hub zones.
 * @param {string} hostname
 */
export function hostnameUsesAllowedZone(hostname) {
  const host = String(hostname ?? '').trim().toLowerCase();
  if (!host) return true;
  return zoneNameForHostname(host) !== null;
}

/**
 * @param {string} hostname
 * @param {readonly string[]} [allowedZones]
 */
export function validateWizardHostname(hostname, allowedZones = ALLOWED_HUB_ZONE_NAMES) {
  const host = String(hostname ?? '').trim().toLowerCase();
  const HOSTNAME_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!host) return 'Hostname is required.';
  if (!HOSTNAME_RE.test(host)) return 'Hostname must be a valid DNS name.';
  if (!allowedZones.some((zone) => host === zone || host.endsWith(`.${zone}`))) {
    return `Hostname must be under ${allowedZones.join(' or ')}.`;
  }
  return null;
}
