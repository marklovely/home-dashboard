import {
  fetchHubSecretsStatus,
  fetchSiteProfile,
  patchHubSecrets,
  patchSiteProfile,
  resetHubSite
} from '../api/siteSetupApi.js';
import { refreshPrivateConfig } from './privateConfigService.js';

/** @typedef {{ profile: Record<string, unknown>, guideSeeded?: boolean }} SiteProfileState */

/** @type {SiteProfileState | null} */
let state = null;

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener();
  }
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
  if (result.ok && result.data) {
    state = result.data;
    notify();
    return state;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} patch
 * @param {typeof fetch} [fetchImpl]
 */
export async function saveSiteProfile(patch, fetchImpl = fetch) {
  const result = await patchSiteProfile(patch, { fetchImpl });
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
  if (result.ok) {
    await refreshPrivateConfig(fetchImpl);
  }
  return result;
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchHubSecretsConfigured(fetchImpl = fetch) {
  return fetchHubSecretsStatus({ fetchImpl });
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function factoryResetHub(fetchImpl = fetch) {
  const result = await resetHubSite({ fetchImpl });
  if (result.ok && result.data) {
    state = {
      profile: result.data.profile,
      guideSeeded: result.data.guideSeeded === true
    };
    notify();
    await refreshPrivateConfig(fetchImpl);
  }
  return result;
}
