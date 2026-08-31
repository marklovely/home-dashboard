/**
 * Public trial watermark API — hub PWAs on *.lovely-hub.com / *.lovely-home.co.uk.
 */

const HUB_ORIGIN_RE =
  /^https:\/\/([a-z][a-z0-9_-]{0,31})\.(lovely-hub\.com|lovely-home\.co\.uk)$/i;

/**
 * @param {string} origin
 * @returns {string | null}
 */
export function siteIdFromHubOrigin(origin) {
  const raw = String(origin ?? '')
    .trim()
    .replace(/\/$/, '');
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return null;
    const host = url.hostname.toLowerCase();
    if (host === 'dashboard.lovely-home.co.uk') return 'production';
    const match = HUB_ORIGIN_RE.exec(`${url.protocol}//${host}`);
    if (!match) return null;
    return match[1].toLowerCase();
  } catch {
    return null;
  }
}

/**
 * @param {Request} request
 * @returns {{ siteId: string | null, headers: Record<string, string> }}
 */
export function publicHubTrialCorsHeaders(request) {
  const requestOrigin = request.headers.get('Origin')?.trim() ?? '';
  const siteId = siteIdFromHubOrigin(requestOrigin);
  if (!siteId) {
    return { siteId: null, headers: { Vary: 'Origin' } };
  }
  return {
    siteId,
    headers: {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      Vary: 'Origin'
    }
  };
}

/**
 * Minimal public payload — only whether the hub should show a trial watermark.
 *
 * @param {{ status?: string | null, trial_end?: number | null } | null | undefined} row
 * @param {number} [nowMs]
 */
export function buildPublicHubTrialStatus(row, nowMs = Date.now()) {
  const status = String(row?.status ?? '');
  const trialEnd = row?.trial_end == null ? null : Number(row.trial_end);
  const trialEndMs = Number.isFinite(trialEnd) && trialEnd > 0 ? trialEnd : null;
  const trialing = status === 'trialing' && (trialEndMs == null || trialEndMs > nowMs);
  return {
    trialing,
    trialEnd: trialing ? trialEndMs : null
  };
}
