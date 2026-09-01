/**
 * Pre-deprovision archive must hit the hub Worker, not the Pages hostname.
 * Hub Pages also deploys functions/api/platform (operator API), which 404s
 * GET /api/platform/site-archive on customer hubs.
 *
 * @param {{ worker_api_origin?: string, hostname?: string }} site
 * @returns {{ url: string, via: 'worker' | 'pages' } | { url: null, via: null }}
 */
export function resolveHubArchiveUrl(site) {
  const workerOrigin = String(site?.worker_api_origin ?? '')
    .trim()
    .replace(/\/$/, '');
  if (workerOrigin) {
    return { url: `${workerOrigin}/api/platform/site-archive`, via: 'worker' };
  }
  const hostname = String(site?.hostname ?? '').trim();
  if (!hostname) return { url: null, via: null };
  return { url: `https://${hostname}/api/platform/site-archive`, via: 'pages' };
}
