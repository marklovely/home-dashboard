/**
 * Resolve a hub site's Cloudflare Pages project name before deprovision.
 */
import { pagesProjectNameForSite } from './hub-api-pages-binding.mjs';
import { readSiteContract } from './read-site-contract.mjs';

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

  return {
    pagesProject: pagesProjectNameForSite(id),
    source: 'default'
  };
}
