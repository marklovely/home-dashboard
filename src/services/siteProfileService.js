import {
  fetchHubSecretsStatus,
  fetchSiteProfile,
  patchHubSecrets,
  patchSiteProfile,
  resetHubSite
} from '../api/siteSetupApi.js';
import { refreshPrivateConfig } from './privateConfigService.js';
import { clearLocalSetup } from './siteSetupLocalStorage.js';
import { resetHubSetupWizardStep } from '../apps/HubSetup/hubSetupWizardState.js';

/** @typedef {{ profile: Record<string, unknown>, guideSeeded?: boolean }} SiteProfileState */
/** @typedef {'unknown' | 'available' | 'offline' | 'not_deployed'} SiteSetupAvailability */

/** @type {SiteProfileState | null} */
let state = null;

/** @type {SiteSetupAvailability} */
let setupAvailability = 'unknown';

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @param {{ ok: boolean, status: number }} result
 */
function applySetupAvailability(result) {
  if (result.ok) {
    setupAvailability = 'available';
    return;
  }
  if (result.status === 404) {
    setupAvailability = 'not_deployed';
    return;
  }
  if (result.status === 503 || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    setupAvailability = 'offline';
    return;
  }
  setupAvailability = 'unknown';
}

/**
 * @returns {boolean}
 */
export function isSiteSetupAvailable() {
  return setupAvailability === 'available';
}

/**
 * @returns {string}
 */
export function getSiteSetupUnavailableMessage() {
  if (setupAvailability === 'offline') {
    return "You're offline or this hub can't be reached right now. Check your internet connection, then tap Try again.";
  }
  if (setupAvailability === 'not_deployed') {
    return "Hub setup isn't available yet. The hub server still needs to be updated before you can save your details. Try again later.";
  }
  return "Hub setup isn't available right now. Try again in a moment.";
}

/**
 * @returns {SiteProfileState | null}
 */
export function getSiteProfileState() {
  return state;
}

/**
 * @returns {boolean}
 */
export function isOnboardingComplete() {
  return state?.profile?.onboardingComplete === true;
}

/**
 * @returns {string}
 */
export function getHubDisplayName() {
  const name = /** @type {string | undefined} */ (state?.profile?.hubName)?.trim();
  return name || 'Home Hub';
}

/**
 * @returns {string}
 */
export function getHubEyebrow() {
  const name = /** @type {string | undefined} */ (state?.profile?.hubName)?.trim();
  return name ? name.toUpperCase() : 'HOME HUB';
}

/**
 * @param {() => void} listener
 */
export function subscribeToSiteProfile(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function syncSiteProfileFromServer(fetchImpl = fetch) {
  const result = await fetchSiteProfile({ fetchImpl });
  applySetupAvailability(result);

  if (result.ok && result.data) {
    state = result.data;
    notify();
    return state;
  }

  notify();
  return null;
}

/**
 * @param {Record<string, unknown>} patch
 * @param {typeof fetch} [fetchImpl]
 */
export async function saveSiteProfile(patch, fetchImpl = fetch) {
  const result = await patchSiteProfile(patch, { fetchImpl });
  applySetupAvailability(result);

  if (!result.ok) {
    return result;
  }

  if (result.data?.profile) {
    state = {
      profile: result.data.profile,
      guideSeeded: state?.guideSeeded ?? false
    };
    notify();
  }
  return result;
}

/**
 * @param {Record<string, string>} patch
 * @param {typeof fetch} [fetchImpl]
 */
export async function saveHubSecrets(patch, fetchImpl = fetch) {
  const result = await patchHubSecrets(patch, { fetchImpl });
  applySetupAvailability(result);

  if (result.ok) {
    await refreshPrivateConfig(fetchImpl);
  }
  return result;
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchHubSecretsConfigured(fetchImpl = fetch) {
  const result = await fetchHubSecretsStatus({ fetchImpl });
  applySetupAvailability(result);
  return result;
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function factoryResetHub(fetchImpl = fetch) {
  resetHubSetupWizardStep();
  const result = await resetHubSite({ fetchImpl });
  applySetupAvailability(result);

  if (!result.ok || !result.data) {
    return result;
  }

  clearLocalSetup();
  state = {
    profile: result.data.profile,
    guideSeeded: result.data.guideSeeded === true
  };
  notify();
  await refreshPrivateConfig(fetchImpl);
  return result;
}
