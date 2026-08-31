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
 * Terraform output only overrides committed contracts when it actually describes
 * the estate. An empty sites output means the wrong workspace or state — not that
 * every hub was destroyed — and trusting it would strip every contract at once.
 *
 * @param {boolean} terraformAvailable
 * @param {Record<string, unknown> | null | undefined} terraformSites
 */
export function terraformOutputIsAuthoritative(terraformAvailable, terraformSites) {
  return Boolean(terraformAvailable) && Object.keys(terraformSites ?? {}).length > 0;
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown>} meta
 * @param {Record<string, unknown>} terraformSites
 * @param {Record<string, { contract?: unknown }> | undefined} preservedSites
 * @param {{ terraformAvailable?: boolean }} [options]
 */
export function resolveSiteContract(siteId, meta, terraformSites, preservedSites, options = {}) {
  const fromTerraform = terraformSites[siteId];
  if (hasTerraformContract(fromTerraform)) {
    return /** @type {Record<string, unknown>} */ (fromTerraform);
  }

  // Terraform output is authoritative whenever we can read it: a Terraform-managed
  // site missing from it has been destroyed (or not applied yet), so reusing the
  // committed contract would advertise D1/R2 ids that no longer exist and show the
  // torn-down hub as provisioned. Sites Terraform does not manage keep their
  // contract, which was hand-written or imported rather than derived from state.
  if (options.terraformAvailable && meta.terraform === true) {
    return null;
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
