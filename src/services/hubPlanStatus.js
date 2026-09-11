import { isDemoHubEnvironment } from '../auth/hubEnvironment.js';
import { isHouseSitterExperience } from '../auth/userMode.js';
/** @type {import('./hubPlanStatus.js').HubPlanSummary | null} */
let cachedPlanSummary = null;

/**
 * @typedef {{
 *   plan: 'free' | 'plus',
 *   planLabel: string,
 *   limits: { maxGuides: number | null, maxStays: number | null },
 *   usage: { guides: number, stays: number },
 *   limitState?: {
 *     atGuideLimit: boolean,
 *     atStayLimit: boolean,
 *     overGuideLimit: boolean,
 *     overStayLimit: boolean
 *   },
 *   guidesExplainer?: string | null,
 *   upgradeUrl: string,
 *   downgradeUrl?: string | null,
 *   accountUrl: string
 * }} HubPlanSummary
 */

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<HubPlanSummary | null>}
 */
export async function fetchHubPlanSummary(fetchImpl = fetch) {
  if (isDemoHubEnvironment() || isHouseSitterExperience()) {
    cachedPlanSummary = null;
    return null;
  }

  try {
    const response = await fetchImpl('/api/hub/plan-usage', {
      headers: { Accept: 'application/json' },
      credentials: 'include'
    });
    if (!response.ok) {
      cachedPlanSummary = null;
      return null;
    }
    const payload = await response.json();
    cachedPlanSummary = {
      plan: payload.plan === 'free' ? 'free' : 'plus',
      planLabel: String(payload.planLabel ?? (payload.plan === 'free' ? 'Free' : 'Lovely Home+')),
      limits: {
        maxGuides: payload.limits?.maxGuides ?? null,
        maxStays: payload.limits?.maxStays ?? null
      },
      usage: {
        guides: Number(payload.usage?.guides ?? 0),
        stays: Number(payload.usage?.stays ?? 0)
      },
      limitState: payload.limitState ?? undefined,
      guidesExplainer: payload.guidesExplainer ?? null,
      upgradeUrl: String(payload.upgradeUrl ?? 'https://lovely-home.co.uk/pricing'),
      downgradeUrl: payload.downgradeUrl ?? null,
      accountUrl: String(payload.accountUrl ?? 'https://lovely-home.co.uk/account')
    };
    return cachedPlanSummary;
  } catch {
    cachedPlanSummary = null;
    return null;
  }
}

/**
 * @returns {HubPlanSummary | null}
 */
export function getCachedHubPlanSummary() {
  return cachedPlanSummary;
}

/**
 * @param {HubPlanSummary | null} summary
 * @returns {string | null}
 */
export function formatPlanUsageLine(summary) {
  if (!summary) return null;
  if (summary.plan === 'plus') {
    return 'Lovely Home+ — unlimited guide templates and scheduled stays';
  }
  const guidePart =
    summary.limits.maxGuides == null
      ? `${summary.usage.guides} guide templates`
      : `${summary.usage.guides} of ${summary.limits.maxGuides} guide templates`;
  const stayPart =
    summary.limits.maxStays == null
      ? `${summary.usage.stays} stays`
      : `${summary.usage.stays} of ${summary.limits.maxStays} scheduled stays`;
  const base = `Free plan — ${guidePart}, ${stayPart}`;
  if (summary.limitState?.overGuideLimit || summary.limitState?.overStayLimit) {
    return `${base}. You can keep existing content; delete extras or upgrade to add more.`;
  }
  if (summary.limitState?.atGuideLimit || summary.limitState?.atStayLimit) {
    return `${base}. At the Free limit — upgrade for more.`;
  }
  return base;
}

/** @internal */
export function setHubPlanSummaryForTests(value) {
  cachedPlanSummary = value;
}
