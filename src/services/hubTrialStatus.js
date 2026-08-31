import { isDemoHubEnvironment } from '../auth/hubEnvironment.js';
import { isHouseSitterExperience } from '../auth/userMode.js';
import { isWallTabletDisplay } from '../lib/wallTabletDisplay.js';

const DEFAULT_PLATFORM_API = 'https://platform.lovely-home.co.uk';

/** @type {boolean | null} */
let cachedTrialing = null;

/**
 * @returns {string}
 */
export function getPlatformApiBase() {
  const fromEnv = String(import.meta.env.VITE_PLATFORM_API_BASE ?? '').trim();
  return (fromEnv || DEFAULT_PLATFORM_API).replace(/\/$/, '');
}

/**
 * @param {unknown} payload
 * @returns {boolean}
 */
export function isHubTrialingPayload(payload) {
  return Boolean(payload && typeof payload === 'object' && /** @type {{ trialing?: unknown }} */ (payload).trialing === true);
}

/**
 * Show on the wall tablet and in sitter mode during a paid trial — not on an
 * owner's laptop/phone browser while they set the hub up.
 *
 * @param {{ trialing?: boolean, sitterMode?: boolean, wallTablet?: boolean, demoHub?: boolean }} options
 */
export function shouldShowTrialWatermark(options) {
  if (options.demoHub) return false;
  if (!options.trialing) return false;
  return Boolean(options.sitterMode || options.wallTablet);
}

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<boolean>}
 */
export async function fetchHubTrialing(fetchImpl = fetch) {
  if (isDemoHubEnvironment()) {
    cachedTrialing = false;
    return false;
  }

  const forced = String(import.meta.env.VITE_TRIAL_WATERMARK ?? '')
    .trim()
    .toLowerCase();
  if (forced === '1' || forced === 'true' || forced === 'yes') {
    cachedTrialing = true;
    return true;
  }

  try {
    const response = await fetchImpl(`${getPlatformApiBase()}/api/public/hub-trial-status`, {
      headers: { Accept: 'application/json' },
      credentials: 'omit'
    });
    if (!response.ok) {
      cachedTrialing = false;
      return false;
    }
    const payload = await response.json();
    cachedTrialing = isHubTrialingPayload(payload);
    return cachedTrialing;
  } catch {
    cachedTrialing = false;
    return false;
  }
}

/**
 * @returns {boolean}
 */
export function shouldShowTrialWatermarkNow() {
  return shouldShowTrialWatermark({
    trialing: cachedTrialing === true,
    sitterMode: isHouseSitterExperience(),
    wallTablet: isWallTabletDisplay(),
    demoHub: isDemoHubEnvironment()
  });
}

/** @internal */
export function setHubTrialingForTests(value) {
  cachedTrialing = value;
}
