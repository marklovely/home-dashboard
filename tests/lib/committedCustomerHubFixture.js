/**
 * Pick a live customer hub from committed registry + manifest for integration tests.
 * Avoids hardcoding site ids (e.g. smith/wagtail) that change when hubs are deprovisioned.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultHubSiteR2BucketNames } from '../../scripts/lib/hub-site-r2-buckets.mjs';
import { CUSTOMER_HUB_ZONE_NAME, defaultHostnameForSite } from '../../scripts/lib/hub-zones.mjs';
import { loadSitesYaml } from '../../scripts/lib/load-sites-yaml.mjs';
import { suggestedPagesProject, suggestedWorkerName } from '../../scripts/lib/site-registry.mjs';
import { terraformStackForSite } from '../../scripts/lib/terraform-stack.mjs';

const root = join(process.cwd());

export function loadCommittedManifest() {
  return JSON.parse(
    readFileSync(join(root, 'platform-admin/public/platform-manifest.json'), 'utf8')
  );
}

export function loadCommittedRegistry() {
  return loadSitesYaml(join(root, 'platform/sites.yaml'));
}

/**
 * Contract fields deprovision scripts expect, derived from site id conventions.
 *
 * @param {string} siteId
 * @param {Record<string, unknown>} [registryEntry]
 */
export function expectedDeprovisionContractFields(siteId, registryEntry = {}) {
  const r2 = defaultHubSiteR2BucketNames(siteId);
  return {
    hostname:
      String(registryEntry.hostname ?? '').trim() ||
      defaultHostnameForSite(siteId, CUSTOMER_HUB_ZONE_NAME),
    hub_environment: String(registryEntry.hub_environment ?? siteId).trim(),
    vanilla: registryEntry.vanilla === false ? false : true,
    workerApiSubstr: suggestedWorkerName(siteId),
    r2_guides_bucket: r2.guides,
    r2_media_bucket: r2.media,
    pagesProject: suggestedPagesProject(siteId)
  };
}

/**
 * @returns {{
 *   siteId: string;
 *   registryEntry: Record<string, unknown>;
 *   contract: Record<string, unknown>;
 *   manifestEntry: Record<string, unknown>;
 *   expected: ReturnType<typeof expectedDeprovisionContractFields>;
 * }}
 */
export function pickCommittedCustomerHubFixture() {
  const registry = loadCommittedRegistry();
  const manifest = loadCommittedManifest();

  const candidates = Object.keys(registry)
    .filter((siteId) => registry[siteId]?.terraform !== false)
    .filter((siteId) => terraformStackForSite(siteId, registry[siteId]) === 'customers')
    .sort();

  for (const siteId of candidates) {
    const registryEntry = registry[siteId];
    const manifestEntry = manifest?.sites?.[siteId];
    const contract = manifestEntry?.contract;
    if (!contract || typeof contract !== 'object') continue;
    if (!String(contract.hostname ?? registryEntry?.hostname ?? '').trim()) continue;

    return {
      siteId,
      registryEntry,
      contract,
      manifestEntry,
      expected: expectedDeprovisionContractFields(siteId, registryEntry)
    };
  }

  throw new Error(
    'No committed customer hub with a manifest contract in platform/sites.yaml.'
  );
}
