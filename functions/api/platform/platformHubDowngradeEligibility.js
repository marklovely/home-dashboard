import { getSiteFromManifest } from './platformApi.js';
import {
  describeHealthFetchResponse,
  fetchWithPlatformHealthAuth,
  platformHealthAuthConfigured
} from './platformHealthFetch.js';

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
      message:
        'Downgrade usage checks are not configured on the platform yet. Email support@lovely-home.co.uk if this persists.'
    };
  }

  if (!platformHealthAuthConfigured(env)) {
    return {
      ok: false,
      error: 'ACCESS_NOT_CONFIGURED',
      message:
        'Hub usage checks need platform health auth. Run platform admin Terraform apply if this persists.'
    };
  }

  const origin = resolveHubWorkerApiOrigin(manifest, siteId, env);
  const url = `${origin}/api/platform/downgrade-eligibility`;

  try {
    const response = await fetchWithPlatformHealthAuth(
      url,
      env,
      {
        method: 'GET',
        headers: {
          'X-Platform-Site-Archive-Secret': secret
        }
      },
      fetchImpl
    );

    const accessBlocked = describeHealthFetchResponse(response, env);
    if (accessBlocked) {
      return {
        ok: false,
        error: accessBlocked.error ?? 'ACCESS_BLOCKED',
        message: 'Could not reach your hub to verify usage (Access blocked). Try again shortly.'
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: 'HUB_USAGE_UNAVAILABLE',
        message:
          response.status === 404
            ? 'Your hub needs a platform update before downgrade checks work. Email support@lovely-home.co.uk.'
            : 'Could not read hub usage right now. Try again shortly.'
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
