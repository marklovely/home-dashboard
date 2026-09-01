/**
 * Cloudflare Pages HUB_API service binding helpers.
 * Git auto-deploys on main can drop production.services while preview stays intact.
 */

/**
 * @param {string} siteId
 */
export function pagesProjectNameForSite(siteId) {
  return siteId === 'production' ? 'home-dashboard' : `home-dashboard-${siteId}`;
}

/**
 * @param {string} siteId
 */
export function workerNameForSite(siteId) {
  return siteId === 'production' ? 'lovely-home-hub-api' : `lovely-home-hub-api-${siteId}`;
}

/**
 * @param {unknown} project
 */
export function productionHubApiService(project) {
  const services =
    /** @type {{ deployment_configs?: { production?: { services?: { HUB_API?: { service?: string } } } } } }} */ (
      project
    ).deployment_configs?.production?.services;
  return String(services?.HUB_API?.service ?? '').trim();
}

/**
 * @param {unknown} project
 * @param {string} expectedWorker
 */
export function productionHubApiMissing(project, expectedWorker) {
  return productionHubApiService(project) !== expectedWorker;
}
