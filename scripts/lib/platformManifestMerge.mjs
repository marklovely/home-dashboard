/**
 * Merge Terraform site output with a preserved platform manifest (local file or fallback).
 */

/**
 * @param {Record<string, unknown> | null | undefined} contract
 */
export function hasTerraformContract(contract) {
  return Boolean(contract && typeof contract === 'object' && Object.keys(contract).length > 0);
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown>} meta
 * @param {Record<string, unknown>} terraformSites
 * @param {Record<string, { contract?: unknown }> | undefined} preservedSites
 */
export function resolveSiteContract(siteId, meta, terraformSites, preservedSites) {
  const fromTerraform = terraformSites[siteId];
  if (hasTerraformContract(fromTerraform)) {
    return /** @type {Record<string, unknown>} */ (fromTerraform);
  }
  const preserved = preservedSites?.[siteId]?.contract;
  if (hasTerraformContract(preserved)) {
    return /** @type {Record<string, unknown>} */ (preserved);
  }
  return null;
}

/**
 * @param {Record<string, string>} next
 * @param {Record<string, string> | undefined} preserved
 */
export function mergePlatformMeta(next, preserved) {
  if (!preserved) return next;
  /** @type {Record<string, string>} */
  const merged = { ...next };
  for (const [key, value] of Object.entries(preserved)) {
    if (value && !merged[key]) {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown> | null} contract
 * @param {string} hostname
 */
export function siteManifestFields(siteId, contract, hostname) {
  return {
    pagesProject:
      contract?.pages_project ??
      (siteId === 'production' ? 'home-dashboard' : `home-dashboard-${siteId}`),
    workerName:
      contract?.worker_name ??
      (siteId === 'production' ? 'lovely-home-hub-api' : `lovely-home-hub-api-${siteId}`),
    pagesUrl: contract?.pages_url ?? (hostname ? `https://${hostname}` : ''),
    workerApiOrigin:
      contract?.worker_api_origin ??
      (contract?.worker_hostname ? `https://${contract.worker_hostname}` : null)
  };
}
