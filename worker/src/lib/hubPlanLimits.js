const DEFAULT_PLATFORM_API = 'https://platform.lovely-home.co.uk';

const HUB_ORIGIN_RE =
  /^https:\/\/([a-z][a-z0-9_-]{0,31})\.(lovely-hub\.com|lovely-home\.co\.uk)$/i;

/**
 * @param {Request | string} requestOrOrigin
 * @returns {string | null}
 */
export function siteIdFromHubRequest(requestOrOrigin) {
  const raw =
    typeof requestOrOrigin === 'string'
      ? requestOrOrigin
      : requestOrOrigin.headers.get('Origin')?.trim() ||
        `https://${requestOrOrigin.headers.get('Host') ?? ''}`;
  const normalized = String(raw ?? '')
    .trim()
    .replace(/\/$/, '');
  if (!normalized) return null;
  try {
    const url = normalized.includes('://') ? new URL(normalized) : new URL(`https://${normalized}`);
    const match = HUB_ORIGIN_RE.exec(`${url.protocol}//${url.hostname.toLowerCase()}`);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
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

  const origin = `https://${siteId}.lovely-hub.com`;
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
