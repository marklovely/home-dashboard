const DEFAULT_PLATFORM_API = 'https://platform.lovely-home.co.uk';

const HUB_ORIGIN_RE =
  /^https:\/\/([a-z][a-z0-9_-]{0,31})\.(lovely-hub\.com|lovely-home\.co\.uk)$/i;

/**
 * @param {string} hostname
 * @returns {string | null}
 */
export function siteIdFromHubHostname(hostname) {
  const host = String(hostname ?? '')
    .trim()
    .toLowerCase()
    .split(':')[0];
  if (!host) return null;
  const match = HUB_ORIGIN_RE.exec(`https://${host}`);
  return match ? match[1].toLowerCase() : null;
}

/**
 * @param {string} value
 * @returns {string | null}
 */
function siteIdFromHubUrl(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/\/$/, '');
  if (!normalized) return null;
  try {
    const url = normalized.includes('://') ? new URL(normalized) : new URL(`https://${normalized}`);
    return siteIdFromHubHostname(url.hostname);
  } catch {
    return null;
  }
}

/**
 * @param {Request | string} requestOrOrigin
 * @returns {string | null}
 */
export function siteIdFromHubRequest(requestOrOrigin) {
  if (typeof requestOrOrigin !== 'string') {
    const forwardedHost = requestOrOrigin.headers.get('X-Hub-Pages-Host');
    const fromForwarded = siteIdFromHubHostname(forwardedHost);
    if (fromForwarded) return fromForwarded;

    const fromOrigin = siteIdFromHubUrl(requestOrOrigin.headers.get('Origin') ?? '');
    if (fromOrigin) return fromOrigin;

    const fromHost = siteIdFromHubHostname(requestOrOrigin.headers.get('Host'));
    if (fromHost) return fromHost;
  }

  return siteIdFromHubUrl(requestOrOrigin);
}

/**
 * @param {Request} request
 * @param {string} siteId
 */
function hubOriginFromRequest(request, siteId) {
  const forwardedHost = request.headers.get('X-Hub-Pages-Host')?.trim().toLowerCase();
  if (forwardedHost) {
    const fromForwarded = siteIdFromHubHostname(forwardedHost);
    if (fromForwarded === siteId) return `https://${forwardedHost.split(':')[0]}`;
  }

  const origin = request.headers.get('Origin')?.trim().replace(/\/$/, '');
  if (origin && siteIdFromHubRequest(origin) === siteId) return origin;

  const host = request.headers.get('Host')?.trim().split(':')[0];
  const fromHost = siteIdFromHubHostname(host);
  if (fromHost === siteId && host) return `https://${host.toLowerCase()}`;

  return `https://${siteId}.lovely-hub.com`;
}

/**
 * @param {Record<string, string | undefined>} env
 */
function platformApiBase(env) {
  return String(env.PLATFORM_API_ORIGIN ?? DEFAULT_PLATFORM_API).replace(/\/$/, '');
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {Request} request
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchHubPlanStatus(env, request, fetchImpl = fetch) {
  const siteId = siteIdFromHubRequest(request);
  if (!siteId) {
    return {
      ok: true,
      plan: 'plus',
      planLabel: 'Lovely Home+',
      limits: { maxGuides: null, maxStays: null }
    };
  }

  const origin = hubOriginFromRequest(request, siteId);
  try {
    const response = await fetchImpl(`${platformApiBase(env)}/api/public/hub-plan-status`, {
      headers: { Accept: 'application/json', Origin: origin }
    });
    if (!response.ok) {
      return {
        ok: false,
        plan: 'plus',
        planLabel: 'Lovely Home+',
        limits: { maxGuides: null, maxStays: null }
      };
    }
    const payload = await response.json();
    return {
      ok: true,
      plan: payload.plan === 'free' ? 'free' : 'plus',
      planLabel: String(payload.planLabel ?? (payload.plan === 'free' ? 'Free' : 'Lovely Home+')),
      limits: {
        maxGuides:
          payload.limits?.maxGuides == null ? null : Number(payload.limits.maxGuides),
        maxStays: payload.limits?.maxStays == null ? null : Number(payload.limits.maxStays)
      },
      upgradeUrl: String(payload.upgradeUrl ?? 'https://lovely-home.co.uk/pricing'),
      accountUrl: String(payload.accountUrl ?? 'https://lovely-home.co.uk/account')
    };
  } catch {
    return {
      ok: false,
      plan: 'plus',
      planLabel: 'Lovely Home+',
      limits: { maxGuides: null, maxStays: null }
    };
  }
}

/**
 * @param {{ limits?: { maxStays?: number | null, maxGuides?: number | null } }} plan
 * @param {number} count
 * @param {'stay' | 'guide'} kind
 */
export function planLimitExceeded(plan, count, kind) {
  const max = kind === 'guide' ? plan.limits?.maxGuides : plan.limits?.maxStays;
  if (max == null || !Number.isFinite(max)) return false;
  return count >= max;
}
