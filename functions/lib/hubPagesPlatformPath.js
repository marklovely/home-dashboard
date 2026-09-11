/** @type {Set<string>} */
const HUB_PAGES_PLATFORM_WORKER_ROUTES = new Set(['platform/site-archive', 'platform/site-restore']);

/**
 * Hub Pages must 503 operator platform routes, except Worker-owned archive/restore paths.
 * @param {string} suffix
 */
export function hubPagesPlatformPathUnavailable(suffix) {
  return !HUB_PAGES_PLATFORM_WORKER_ROUTES.has(suffix) && (suffix === 'platform' || suffix.startsWith('platform/'));
}
