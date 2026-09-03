/**
 * Merge Terraform site output with a preserved platform manifest (local file or fallback).
 */
import { isTerraformStack, terraformStackForSite } from './terraform-stack.mjs';

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
 * @param {{ terraformAvailable?: boolean; terraformStack?: string | null; authoritativeSiteIds?: Iterable<string> | null }} [options]
 */
export function resolveSiteContract(siteId, meta, terraformSites, preservedSites, options = {}) {
  const fromTerraform = terraformSites[siteId];
  if (hasTerraformContract(fromTerraform)) {
    return /** @type {Record<string, unknown>} */ (fromTerraform);
  }

  const preserved = preservedSites?.[siteId]?.contract;
  const siteStack = terraformStackForSite(siteId, meta);
  const currentStack = isTerraformStack(options.terraformStack) ? options.terraformStack : null;
  const authoritativeSiteIds = options.authoritativeSiteIds
    ? new Set([...options.authoritativeSiteIds])
    : null;

  // A split-stack apply only owns one estate. Missing output for the other
  // stack must not look like a destroy.
  if (currentStack && siteStack !== currentStack) {
    if (hasTerraformContract(preserved)) {
      return /** @type {Record<string, unknown>} */ (preserved);
    }
    return null;
  }

  // Per-site customer state only speaks for that hub. Missing output for other
  // households must keep the committed contract.
  if (authoritativeSiteIds && !authoritativeSiteIds.has(siteId)) {
    if (hasTerraformContract(preserved)) {
      return /** @type {Record<string, unknown>} */ (preserved);
    }
    return null;
  }

  // Terraform output is authoritative for this stack (or this site): a
  // Terraform-managed site missing from it has been destroyed (or not applied yet).
  if (options.terraformAvailable && meta.terraform === true) {
    return null;
  }

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
