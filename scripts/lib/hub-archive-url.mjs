/**
 * Platform CI routes (archive export, archive restore) must hit the hub Worker when
 * possible. Hub Pages also deploys functions/api/platform (operator API), which
 * 404s those paths on customer hubs unless proxied to the Worker.
 *
 * @param {{ worker_api_origin?: string, hostname?: string }} site
 * @param {'site-archive' | 'site-restore'} route
 * @returns {{ url: string, via: 'worker' | 'pages' } | { url: null, via: null }}
 */
export function resolveHubPlatformApiUrl(site, route) {
  const path = `/api/platform/${route}`;
  const workerOrigin = String(site?.worker_api_origin ?? '')
    .trim()
    .replace(/\/$/, '');
  if (workerOrigin) {
    return { url: `${workerOrigin}${path}`, via: 'worker' };
  }
  const hostname = String(site?.hostname ?? '').trim();
  if (!hostname) return { url: null, via: null };
  return { url: `https://${hostname}${path}`, via: 'pages' };
}

/**
 * @param {{ worker_api_origin?: string, hostname?: string }} site
 * @returns {{ url: string, via: 'worker' | 'pages' } | { url: null, via: null }}
 */
export function resolveHubArchiveUrl(site) {
  return resolveHubPlatformApiUrl(site, 'site-archive');
}
