import { getSiteFromManifest } from './platformApi.js';

/**
 * @param {object | null | undefined} manifest
 * @param {string} siteId
 * @param {Record<string, string | undefined>} [env]
 */
export function resolveHubWorkerApiOrigin(manifest, siteId, env = {}) {
  const normalized = String(siteId ?? '')
    .trim()
    .toLowerCase();
  const site = getSiteFromManifest(manifest ?? {}, normalized);
  const contract = /** @type {Record<string, unknown>} */ (site?.contract ?? site ?? {});
  const fromContract = String(
    contract.worker_api_origin ?? contract.workerApiOrigin ?? site?.workerApiOrigin ?? ''
  )
    .trim()
    .replace(/\/$/, '');
  if (fromContract) return fromContract;

  const subdomain = String(
    env.CLOUDFLARE_WORKERS_SUBDOMAIN ?? env.WORKERS_SUBDOMAIN ?? 'mark-lovely67'
  ).trim();
  return `https://lovely-home-hub-api-${normalized}.${subdomain}.workers.dev`;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {object | null | undefined} manifest
 * @param {string} siteId
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchHubFreeDowngradeUsage(env, manifest, siteId, fetchImpl = fetch) {
  const secret = env.PLATFORM_SITE_ARCHIVE_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      error: 'NOT_CONFIGURED',
      message: 'Downgrade usage checks are not configured.'
    };
  }

  const origin = resolveHubWorkerApiOrigin(manifest, siteId, env);
  try {
    const response = await fetchImpl(`${origin}/api/platform/downgrade-eligibility`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'X-Platform-Site-Archive-Secret': secret
      }
    });

    if (!response.ok) {
      return {
        ok: false,
        error: 'HUB_USAGE_UNAVAILABLE',
        message: 'Could not read hub usage right now. Try again shortly.'
      };
    }

    const body = await response.json().catch(() => null);
    const usage = body?.usage;
    if (!usage || typeof usage !== 'object') {
      return {
        ok: false,
        error: 'HUB_USAGE_INVALID',
        message: 'Could not read hub usage right now. Try again shortly.'
      };
    }

    return { ok: true, usage };
  } catch {
    return {
      ok: false,
      error: 'HUB_USAGE_UNAVAILABLE',
      message: 'Could not read hub usage right now. Try again shortly.'
    };
  }
}
