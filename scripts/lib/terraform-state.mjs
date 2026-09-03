import { execFileSync } from 'node:child_process';

const HUB_SITE_MODULE_PREFIX_RE = /^module\.hub_site\["([^"]+)"\]/;

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
 * Site ids with any resource under module.hub_site["id"] in a state list.
 *
 * @param {string} stateList
 * @returns {Set<string>}
 */
export function readHubSiteIdsFromStateList(stateList) {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const line of String(stateList ?? '').split('\n')) {
    const match = line.trim().match(HUB_SITE_MODULE_PREFIX_RE);
    if (match) ids.add(match[1]);
  }
  return ids;
}

/**
 * @param {string} tfDir
 * @returns {string}
 */
export function readTerraformStateList(tfDir) {
  return execFileSync('terraform', ['state', 'list'], {
    cwd: tfDir,
    encoding: 'utf8'
  });
}

/**
 * @param {string} siteId
 * @param {string} tfDir
 */
export function hubSiteModuleInState(siteId, tfDir) {
  const stateList = readTerraformStateList(tfDir);
  return stateListIncludesHubSite(stateList, siteId);
}

/**
 * @param {string} tfDir
 * @returns {Set<string>}
 */
export function readTerraformHubSiteIds(tfDir) {
  try {
    return readHubSiteIdsFromStateList(readTerraformStateList(tfDir));
  } catch {
    return new Set();
  }
}
