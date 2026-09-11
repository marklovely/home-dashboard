import {
  describeHealthFetchResponse,
  fetchWithPlatformHealthAuth,
  platformHealthAuthConfigured
} from './platformHealthFetch.js';
import { resolveHubWorkerApiOrigin } from './platformHubDowngradeEligibility.js';

/**
 * @param {Record<string, string | undefined>} env
 * @param {object | null | undefined} manifest
 * @param {string} siteId
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchHubThirdPartyUsage(env, manifest, siteId, fetchImpl = fetch) {
  const secret = env.PLATFORM_SITE_ARCHIVE_SECRET?.trim();
  if (!secret) {
    return {
      ok: false,
      error: 'NOT_CONFIGURED',
      message: 'Platform archive secret is not configured.'
    };
  }

  if (!platformHealthAuthConfigured(env)) {
    return {
      ok: false,
      error: 'ACCESS_NOT_CONFIGURED',
      message: 'Hub usage checks need platform health auth.'
    };
  }

  const origin = resolveHubWorkerApiOrigin(manifest, siteId, env);
  const url = `${origin}/api/platform/third-party-usage`;

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
        message: 'Could not reach hub to read API usage (Access blocked).'
      };
    }

    if (!response.ok) {
      return {
        ok: false,
        error: 'HUB_USAGE_UNAVAILABLE',
        message:
          response.status === 404
            ? 'Hub needs a platform update before API usage tracking works.'
            : 'Could not read hub API usage right now.'
      };
    }

    const body = await response.json().catch(() => null);
    const usage = body?.usage;
    if (!usage || typeof usage !== 'object') {
      return {
        ok: false,
        error: 'HUB_USAGE_INVALID',
        message: 'Could not read hub API usage right now.'
      };
    }

    return { ok: true, usage };
  } catch {
    return {
      ok: false,
      error: 'HUB_USAGE_UNAVAILABLE',
      message: 'Could not read hub API usage right now.'
    };
  }
}

/**
 * @param {object} manifest
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 */
export async function aggregateThirdPartyUsage(manifest, env, fetchImpl = fetch) {
  const sites = Object.values(manifest.sites ?? {});
  const terraformSites = sites.filter((site) => site?.terraform === true);

  const rows = await Promise.all(
    terraformSites.map(async (site) => {
      const siteId = String(site.siteId ?? '');
      const result = await fetchHubThirdPartyUsage(env, manifest, siteId, fetchImpl);
      return { siteId, result };
    })
  );

  const month = new Date().toISOString().slice(0, 7);
  let lifetimeTotal = 0;
  let monthTotal = 0;
  let reachableHubs = 0;
  /** @type {Array<{ siteId: string, lifetime: number, monthCalls: number, error?: string }>} */
  const hubs = [];

  for (const row of rows) {
    if (!row.result.ok) {
      hubs.push({
        siteId: row.siteId,
        lifetime: 0,
        monthCalls: 0,
        error: row.result.message ?? row.result.error ?? 'Unavailable'
      });
      continue;
    }

    reachableHubs += 1;
    const osPlaces = row.result.usage?.osPlaces ?? {};
    const lifetime = Number(osPlaces.lifetime) || 0;
    const monthCalls =
      String(osPlaces.month ?? '') === month ? Number(osPlaces.monthCalls) || 0 : 0;
    lifetimeTotal += lifetime;
    monthTotal += monthCalls;
    hubs.push({ siteId: row.siteId, lifetime, monthCalls });
  }

  return {
    checkedAt: new Date().toISOString(),
    month,
    osPlaces: {
      configuredOnPlatform: Boolean(env.PLATFORM_SITE_ARCHIVE_SECRET?.trim()),
      reachableHubs,
      hubCount: terraformSites.length,
      lifetimeTotal,
      monthTotal,
      hubs: hubs.sort((a, b) => b.monthCalls - a.monthCalls || a.siteId.localeCompare(b.siteId))
    },
    dashboardUrl: 'https://osdatahub.os.uk/'
  };
}
