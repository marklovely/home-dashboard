import { isDemoHubEnvironment } from '../auth/hubEnvironment.js';
import { isOwnerUserMode } from '../auth/userMode.js';

/**
 * @typedef {{
 *   plan: 'free' | 'plus',
 *   planLabel: string,
 *   features: { bins: boolean, smartHome: boolean, weather: boolean },
 *   upgradeUrl: string
 * }} HubPlanFeatures
 */

/** @type {HubPlanFeatures | null} */
let cachedPlanFeatures = null;

const DEFAULT_PLUS_FEATURES = { bins: true, smartHome: true, weather: true };

/**
 * @param {unknown} payload
 * @returns {HubPlanFeatures | null}
 */
function parsePlanFeaturesPayload(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const plan = payload.plan === 'free' ? 'free' : 'plus';
  const features = payload.features ?? payload.limits?.features ?? {};
  return {
    plan,
    planLabel: String(payload.planLabel ?? (plan === 'free' ? 'Free' : 'Lovely Home+')),
    features: {
      bins: plan === 'plus' ? true : Boolean(features.bins),
      smartHome: plan === 'plus' ? true : Boolean(features.smartHome),
      weather: features.weather !== false
    },
    upgradeUrl: String(payload.upgradeUrl ?? 'https://lovely-home.co.uk/pricing')
  };
}

/**
 * Load plan feature flags for the current hub (owner and sitter sessions).
 *
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<HubPlanFeatures | null>}
 */
export async function initHubPlanFeatures(fetchImpl = fetch) {
  if (isDemoHubEnvironment()) {
    cachedPlanFeatures = null;
    return null;
  }

  try {
    const response = await fetchImpl('/api/hub/plan-features', {
      headers: { Accept: 'application/json' },
      credentials: 'include'
    });
    if (!response.ok) {
      cachedPlanFeatures = null;
      return null;
    }
    cachedPlanFeatures = parsePlanFeaturesPayload(await response.json());
    return cachedPlanFeatures;
  } catch {
    cachedPlanFeatures = null;
    return null;
  }
}

/**
 * @param {HubPlanFeatures | null} summary
 */
export function applyHubPlanFeaturesFromSummary(summary) {
  if (!summary?.features) return;
  cachedPlanFeatures = {
    plan: summary.plan,
    planLabel: summary.planLabel,
    features: {
      bins: summary.plan === 'plus' ? true : Boolean(summary.features?.bins),
      smartHome: summary.plan === 'plus' ? true : Boolean(summary.features?.smartHome),
      weather: summary.features?.weather !== false
    },
    upgradeUrl: summary.upgradeUrl
  };
}

/**
 * @returns {HubPlanFeatures | null}
 */
export function getCachedHubPlanFeatures() {
  return cachedPlanFeatures;
}

/**
 * @param {'bins' | 'smartHome' | 'weather'} feature
 */
export function isHubPlanFeatureEnabled(feature) {
  if (!cachedPlanFeatures) return true;
  if (cachedPlanFeatures.plan === 'plus') return true;
  return Boolean(cachedPlanFeatures.features[feature]);
}

/** @internal */
export function setHubPlanFeaturesForTests(value) {
  cachedPlanFeatures = value;
}

/**
 * @param {'bins' | 'smartHome'} feature
 * @returns {{ title: string, body: string, showUpgrade: boolean, upgradeUrl: string | null }}
 */
export function planFeatureLockedCopy(feature) {
  const isOwner = isOwnerUserMode();
  if (feature === 'bins') {
    return {
      title: 'Bin reminders',
      body: isOwner
        ? 'Collection reminders and bin schedules are part of Lovely Home+. Upgrade to add dates, home-screen alerts, and council import tools.'
        : 'Bin reminders are not available on this home. The owner needs Lovely Home+ to enable collection reminders for sitters and guests.',
      showUpgrade: isOwner,
      upgradeUrl: isOwner ? (cachedPlanFeatures?.upgradeUrl ?? 'https://lovely-home.co.uk/pricing') : null
    };
  }
  return {
    title: 'Home controls',
    body: isOwner
      ? 'Alexa Virtual Button routines and smart-home controls are part of Lovely Home+. Upgrade to run lighting and scene controls from the hub and House Guide.'
      : 'Home controls are not available on this home. The owner needs Lovely Home+ to enable Alexa routines for sitters.',
    showUpgrade: isOwner,
    upgradeUrl: isOwner ? (cachedPlanFeatures?.upgradeUrl ?? 'https://lovely-home.co.uk/pricing') : null
  };
}

export { DEFAULT_PLUS_FEATURES };
