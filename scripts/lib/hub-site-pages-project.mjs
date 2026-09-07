/**
 * Resolve a hub site's Cloudflare Pages project name before deprovision.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pagesProjectNameForSite } from './hub-api-pages-binding.mjs';
import { readSiteContract } from './read-site-contract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * @param {string} siteId
 * @returns {string}
 */
function readManifestPagesProject(siteId) {
  const manifestPath = join(root, 'platform-admin/public/platform-manifest.json');
  if (!existsSync(manifestPath)) return '';

  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    const entry = manifest?.sites?.[siteId];
    const contract = entry?.contract ?? entry;
    return String(contract?.pages_project ?? '').trim();
  } catch {
    return '';
  }
}

/**
 * Resolve Pages project name without calling Terraform (manifest, then naming convention).
 *
 * @param {string} siteId
 * @returns {{ pagesProject: string, source: 'manifest' | 'default' }}
 */
export function resolveHubSitePagesProjectOffline(siteId) {
  const id = siteId.trim();
  const fromManifest = readManifestPagesProject(id);
  if (fromManifest) {
    return { pagesProject: fromManifest, source: 'manifest' };
  }

  return {
    pagesProject: pagesProjectNameForSite(id),
    source: 'default'
  };
}

/**
 * @param {string} siteId
 * @returns {{ pagesProject: string, source: 'terraform' | 'manifest' | 'registry' | 'default' }}
 */
export function resolveHubSitePagesProject(siteId) {
  const id = siteId.trim();
  const resolved = readSiteContract(id);
  const fromContract = String(resolved?.site?.pages_project ?? '').trim();
  if (fromContract) {
    return {
      pagesProject: fromContract,
      source: resolved?.source ?? 'terraform'
    };
  }

  return resolveHubSitePagesProjectOffline(id);
}
