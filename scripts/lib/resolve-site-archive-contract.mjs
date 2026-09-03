/**
 * Resolve hostname / worker origin for pre-deprovision archive when Terraform
 * output is missing (e.g. per-site customer state before outputs were refreshed).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './load-sites-yaml.mjs';
import { suggestedWorkerName } from './site-registry.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const root = join(moduleDir, '../..');
const TERRAFORM_SUBPROCESS_TIMEOUT_MS = 5000;

/**
 * @param {string} siteId
 * @param {string} workerName
 */
function workerApiOriginFromName(siteId, workerName) {
  const subdomain =
    process.env.WORKERS_SUBDOMAIN?.trim() ||
    process.env.CLOUDFLARE_WORKERS_SUBDOMAIN?.trim() ||
    'mark-lovely67';
  const name = workerName?.trim() || suggestedWorkerName(siteId);
  return `https://${name}.${subdomain}.workers.dev`;
}

/**
 * @param {Record<string, unknown> | null | undefined} contract
 */
function contractHasArchiveTarget(contract) {
  return Boolean(
    String(contract?.worker_api_origin ?? '').trim() || String(contract?.hostname ?? '').trim()
  );
}

/**
 * @param {string} siteId
 */
function readTerraformSiteContract(siteId) {
  try {
    const raw = execFileSync(
      'node',
      [join(root, 'scripts/lib/terraform-site-output.mjs'), 'site', siteId],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: TERRAFORM_SUBPROCESS_TIMEOUT_MS }
    );
    const contract = JSON.parse(raw);
    return contractHasArchiveTarget(contract) ? contract : null;
  } catch {
    return null;
  }
}

/**
 * @param {string} siteId
 */
function readManifestSiteContract(siteId) {
  const manifestPath = join(root, 'platform-admin/public/platform-manifest.json');
  if (!existsSync(manifestPath)) return null;

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const entry = manifest?.sites?.[siteId];
    if (!entry || typeof entry !== 'object') return null;

    const contract = /** @type {Record<string, unknown>} */ (entry.contract ?? {});
    if (contractHasArchiveTarget(contract)) {
      return contract;
    }

    const hostname = String(entry.hostname ?? contract.hostname ?? '').trim();
    const workerApiOrigin = String(
      entry.workerApiOrigin ?? contract.worker_api_origin ?? ''
    ).trim();
    if (!hostname && !workerApiOrigin) return null;

    return {
      hostname,
      worker_api_origin: workerApiOrigin || undefined,
      worker_name: String(entry.workerName ?? contract.worker_name ?? suggestedWorkerName(siteId))
    };
  } catch {
    return null;
  }
}

/**
 * @param {string} siteId
 */
function readRegistrySiteContract(siteId) {
  const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
  const meta = registry[siteId];
  const hostname = String(meta?.hostname ?? '').trim();
  if (!hostname) return null;

  const workerName = suggestedWorkerName(siteId);
  return {
    hostname,
    hub_environment: meta.hub_environment ?? siteId,
    worker_name: workerName,
    worker_api_origin: workerApiOriginFromName(siteId, workerName)
  };
}

/**
 * @param {string} siteId
 * @returns {{ site: Record<string, unknown>, source: 'terraform' | 'manifest' | 'registry' } | null}
 */
export function resolveSiteArchiveContract(siteId) {
  const fromTerraform = readTerraformSiteContract(siteId);
  if (fromTerraform) {
    return { site: fromTerraform, source: 'terraform' };
  }

  const fromManifest = readManifestSiteContract(siteId);
  if (fromManifest) {
    return { site: fromManifest, source: 'manifest' };
  }

  const fromRegistry = readRegistrySiteContract(siteId);
  if (fromRegistry) {
    return { site: fromRegistry, source: 'registry' };
  }

  return null;
}
