import { CUSTOMER_HUB_ZONE_NAME, PLATFORM_ZONE_NAME, resolveSiteZoneName } from './hub-zones.mjs';

/** @typedef {'platform' | 'customers'} TerraformStack */

export const TERRAFORM_STACKS = /** @type {const} */ (['platform', 'customers']);

/** Internal hubs that stay on lovely-home.co.uk even if yaml is already gone. */
export const PLATFORM_STACK_SITE_IDS = new Set(['production', 'test', 'sandbox', 'demo', 'dev']);

/** R2 object keys for the split Terraform backends. */
export const TERRAFORM_BACKEND_KEYS = {
  platform: 'home-dashboard/platform.tfstate',
  customers: 'home-dashboard/customers.tfstate',
  legacy: 'home-dashboard/hub.tfstate'
};

/** Prefix for per-household customer state: home-dashboard/customers/{siteId}.tfstate */
export const TERRAFORM_CUSTOMERS_SITE_PREFIX = 'home-dashboard/customers/';

const BACKEND_SITE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;

/**
 * Site ids become R2 object path segments. Refuse anything that could escape
 * the customers/ prefix.
 *
 * @param {string} siteId
 * @returns {string | null} error message, or null when OK
 */
export function terraformBackendSiteIdError(siteId) {
  const id = String(siteId ?? '').trim();
  if (!id) return 'Customer Terraform state needs a site id.';
  if (id.includes('/') || id.includes('\\') || id.includes('..')) {
    return `Site id ${JSON.stringify(id)} is not safe as a Terraform state key.`;
  }
  if (!BACKEND_SITE_ID_RE.test(id)) {
    return `Site id ${JSON.stringify(id)} is not a valid Terraform state key.`;
  }
  return null;
}

/**
 * @param {unknown} value
 * @returns {value is TerraformStack}
 */
export function isTerraformStack(value) {
  return value === 'platform' || value === 'customers';
}

/**
 * Customer hubs ({site}.lovely-hub.com) are the signup/teardown stack.
 * Internal hubs on lovely-home.co.uk stay with platform admin.
 *
 * @param {string} siteId
 * @param {Record<string, unknown> | null | undefined} site
 * @param {{ platformZone?: string; customerZone?: string }} [zones]
 * @returns {TerraformStack}
 */
export function terraformStackForSite(siteId, site, zones = {}) {
  const platformZone = zones.platformZone ?? PLATFORM_ZONE_NAME;
  const customerZone = zones.customerZone ?? CUSTOMER_HUB_ZONE_NAME;
  if (site?.customer_hub === true) return 'customers';
  if (site?.customer_hub === false) return 'platform';
  const zone = resolveSiteZoneName(siteId, site ?? {}, platformZone);
  return zone === customerZone ? 'customers' : 'platform';
}

/**
 * @param {Record<string, Record<string, unknown>>} registry
 * @param {TerraformStack} stack
 * @returns {string[]}
 */
export function siteIdsForTerraformStack(registry, stack) {
  return Object.keys(registry).filter((siteId) => terraformStackForSite(siteId, registry[siteId]) === stack);
}

/**
 * @param {TerraformStack} stack
 * @param {string} [siteId] per-site customers backend; ignored on platform
 */
export function terraformBackendKey(stack, siteId = '') {
  const id = String(siteId ?? '').trim();
  if (stack === 'customers' && id) {
    const error = terraformBackendSiteIdError(id);
    if (error) {
      throw new Error(error);
    }
    return `${TERRAFORM_CUSTOMERS_SITE_PREFIX}${id}.tfstate`;
  }
  return TERRAFORM_BACKEND_KEYS[stack];
}

/**
 * When a site is already removed from yaml (deprovision), infer the stack.
 * Household and e2e hubs are customers; named internal hubs stay on platform.
 *
 * @param {string} siteId
 * @returns {TerraformStack}
 */
export function guessTerraformStackForMissingSite(siteId) {
  if (PLATFORM_STACK_SITE_IDS.has(siteId)) return 'platform';
  if (/^e2e-[a-z0-9-]+$/.test(siteId)) return 'customers';
  return 'customers';
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown> | null | undefined} site
 * @param {string | null | undefined} envStack
 * @returns {TerraformStack}
 */
export function resolveTerraformStack(siteId, site, envStack = null) {
  if (isTerraformStack(envStack)) return envStack;
  if (site) return terraformStackForSite(siteId, site);
  return guessTerraformStackForMissingSite(siteId);
}

/**
 * @param {string[]} siteIds
 * @param {Record<string, Record<string, unknown> | undefined>} registry
 * @returns {{ platform: string[]; customers: string[] }}
 */
export function partitionSiteIdsByStack(siteIds, registry) {
  /** @type {{ platform: string[]; customers: string[] }} */
  const partitioned = { platform: [], customers: [] };
  for (const siteId of siteIds) {
    const stack = resolveTerraformStack(siteId, registry[siteId]);
    partitioned[stack].push(siteId);
  }
  return partitioned;
}

/**
 * @param {string} stateList
 * @returns {string[]}
 */
export function hubSiteIdsFromStateList(stateList) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const line of String(stateList ?? '').split('\n')) {
    const match = line.trim().match(/^module\.hub_site\["([^"]+)"\]/);
    if (match) ids.add(match[1]);
  }
  return [...ids].sort();
}

/**
 * CLI `-var` so an apply cannot silently default to the platform stack.
 * Customer applies also pin provision_site_id so per-site state cannot recreate
 * other household hubs from sites.yaml.
 *
 * @param {TerraformStack} stack
 * @param {string} [siteId]
 */
export function terraformStackVarArgs(stack, siteId = '') {
  const args = [`-var=terraform_stack=${stack}`];
  const id = String(siteId ?? '').trim();
  if (stack === 'customers' && id) {
    args.push(`-var=provision_site_id=${id}`);
  }
  return args;
}
