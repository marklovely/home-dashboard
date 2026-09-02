import { randomUUID } from 'node:crypto';
import { guessTerraformStackForMissingSite, terraformStackForSite } from './terraform-stack.mjs';

/**
 * @param {unknown} moduleAddress
 * @returns {string | null}
 */
export function hubSiteIdFromModuleAddress(moduleAddress) {
  const match = String(moduleAddress ?? '').match(/^module\.hub_site\["([^"]+)"\]/);
  return match ? match[1] : null;
}

/**
 * @param {{ module?: string }} resource
 * @param {Record<string, Record<string, unknown> | undefined>} registry
 * @returns {'platform' | 'customers'}
 */
export function terraformStackForStateResource(resource, registry) {
  const siteId = hubSiteIdFromModuleAddress(resource?.module);
  if (!siteId) return 'platform';
  const site = registry[siteId];
  return site ? terraformStackForSite(siteId, site) : guessTerraformStackForMissingSite(siteId);
}

/**
 * Split a combined (legacy) Terraform state JSON into platform + customers.
 * Outputs are cleared — the next apply/refresh on each backend rebuilds them.
 *
 * @param {Record<string, unknown>} state
 * @param {Record<string, Record<string, unknown> | undefined>} registry
 * @param {{ platformLineage?: string; customersLineage?: string; serial?: number }} [options]
 */
export function splitTerraformState(state, registry, options = {}) {
  const resources = Array.isArray(state.resources) ? state.resources : [];
  /** @type {unknown[]} */
  const platformResources = [];
  /** @type {unknown[]} */
  const customerResources = [];

  for (const resource of resources) {
    if (terraformStackForStateResource(/** @type {{ module?: string }} */ (resource), registry) === 'customers') {
      customerResources.push(resource);
    } else {
      platformResources.push(resource);
    }
  }

  const serial = options.serial ?? Number(state.serial ?? 0) + 1;

  return {
    platform: copyState(state, platformResources, options.platformLineage ?? randomUUID(), serial),
    customers: copyState(state, customerResources, options.customersLineage ?? randomUUID(), serial),
    counts: {
      platform: platformResources.length,
      customers: customerResources.length,
      total: resources.length
    }
  };
}

/**
 * @param {Record<string, unknown>} state
 * @param {unknown[]} resources
 * @param {string} lineage
 * @param {number} serial
 */
function copyState(state, resources, lineage, serial) {
  return {
    ...state,
    serial,
    lineage,
    outputs: {},
    resources
  };
}
