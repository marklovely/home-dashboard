import { buildHouseGuideMediaUrl } from '../api/houseGuideApi.js';

/**
 * @param {import('../types/guideContent.js').GuideCatalog} catalog
 */
export function listGuideMediaUrlsForCache(catalog) {
  /** @type {string[]} */
  const urls = ['/api/house-guide/catalog'];
  for (const [mediaId, asset] of Object.entries(catalog.media ?? {})) {
    if (asset?.hasUpload) {
      urls.push(buildHouseGuideMediaUrl(mediaId));
    }
  }
  return urls;
}

/**
 * @param {string[]} urls
 */
export function warmGuideOfflineCache(urls) {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  const controller = navigator.serviceWorker.controller;
  if (!controller) return;
  controller.postMessage({ type: 'cache-guide-reads', urls });
}

/**
 * @param {import('../types/guideContent.js').GuideCatalog} catalog
 */
export function cacheGuideCatalogForOffline(catalog) {
  warmGuideOfflineCache(listGuideMediaUrlsForCache(catalog));
}
