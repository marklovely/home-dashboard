import { getHubEnvironmentSync } from '../auth/hubEnvironment.js';

/** Names that are product leftovers, not a household hub name. */
const PLACEHOLDER_HUB_NAMES = new Set([
  '',
  'home',
  'home hub',
  'lovely home',
  'lovely home hub'
]);

/** Environments that are not a customer slug we can title-case into a hub name. */
const GENERIC_HUB_ENVIRONMENTS = new Set(['production', 'prod', 'test', 'staging', 'sandbox']);

/**
 * @param {unknown} value
 * @returns {boolean}
 */
export function isPlaceholderHubName(value) {
  return PLACEHOLDER_HUB_NAMES.has(String(value ?? '').trim().toLowerCase());
}

/**
 * Title-case a hub name or site slug (`powell` → `Powell`, `rose-cottage` → `Rose Cottage`).
 * @param {unknown} value
 * @returns {string}
 */
export function titleCaseHubName(value) {
  return String(value ?? '')
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * @param {unknown} environmentId
 * @returns {string}
 */
export function hubNameFromEnvironment(environmentId) {
  const id = String(environmentId ?? '')
    .trim()
    .toLowerCase();
  if (!id || GENERIC_HUB_ENVIRONMENTS.has(id)) return '';
  return id.replace(/[-_]+/g, ' ');
}

/**
 * Household chrome name: `{Hub Name} Home`, without doubling Home.
 * Falls back to the site slug (powell.lovely-hub.com → Powell Home) when the
 * saved name is empty or still the product brand.
 *
 * @param {unknown} rawName
 * @param {unknown} [environmentId]
 * @returns {string}
 */
export function formatHubHomeName(rawName, environmentId = getHubEnvironmentSync()) {
  const trimmed = String(rawName ?? '').trim();
  const source = isPlaceholderHubName(trimmed) ? hubNameFromEnvironment(environmentId) : trimmed;
  const base = titleCaseHubName(source);
  if (!base) return 'Home Hub';
  if (/^home hub$/i.test(base)) return 'Home Hub';
  if (/\bhome$/i.test(base)) return base;
  return `${base} Home`;
}

/** Operator Access login titles for platform hubs (not a household slug). */
export const ACCESS_LOGIN_GENERIC_NAMES = {
  production: 'Lovely Home',
  prod: 'Lovely Home',
  sandbox: 'Sandbox Home',
  test: 'Test Home',
  demo: 'Demo Home',
  dev: 'Dev Home',
  staging: 'Staging Home'
};

/**
 * Cloudflare Access application name shown as “Log in to {name}”.
 * Keep in sync with terraform/modules/hub_environment/access.tf locals.
 *
 * @param {unknown} siteId
 * @param {'pages' | 'worker'} [kind]
 */
export function accessLoginAppName(siteId, kind = 'pages') {
  const id = String(siteId ?? '')
    .trim()
    .toLowerCase();
  const label = ACCESS_LOGIN_GENERIC_NAMES[id] || formatHubHomeName('', id);
  return kind === 'worker' ? `${label} API` : label;
}
