import { execFileSync } from 'node:child_process';

/**
 * True when terraform state contains resources for module.hub_site["siteId"].
 *
 * @param {string} stateList
 * @param {string} siteId
 */
export function stateListIncludesHubSite(stateList, siteId) {
  const prefix = `module.hub_site[${JSON.stringify(siteId)}].`;
  return stateList.split('\n').some((line) => line.trim().startsWith(prefix));
}

/**
 * @param {string} siteId
 * @param {string} tfDir
 */
export function hubSiteModuleInState(siteId, tfDir) {
  try {
    const stateList = execFileSync('terraform', ['state', 'list'], {
      cwd: tfDir,
      encoding: 'utf8'
    });
    return stateListIncludesHubSite(stateList, siteId);
  } catch {
    return false;
  }
}
