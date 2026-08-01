import {
  fetchHubSecretsStatus,
  fetchSiteProfile,
  patchHubSecrets,
  patchSiteProfile,
  resetHubSite
} from '../api/siteSetupApi.js';
import { fetchHouseGuideCatalog } from '../api/houseGuideApi.js';
import { refreshPrivateConfig } from './privateConfigService.js';
import {
  clearLocalSetup,
  DEFAULT_LOCAL_PROFILE,
  loadLocalProfile,
  loadLocalSecrets,
  mergeLocalProfile,
  mergeLocalSecrets,
  SITE_SETUP_LOCAL_ONLY_MESSAGE
} from './siteSetupLocalStorage.js';
import { resetHubSetupWizardStep } from '../apps/HubSetup/hubSetupWizardState.js';

/** @typedef {{ profile: Record<string, unknown>, guideSeeded?: boolean }} SiteProfileState */

/** @type {SiteProfileState | null} */
let state = null;

/** @type {boolean} */
let localOnlyMode = false;

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @returns {boolean}
 */
export function isSiteSetupLocalOnly() {
  return localOnlyMode;
}

/**
 * @returns {string}
 */
export function getSiteSetupLocalOnlyMessage() {
  return SITE_SETUP_LOCAL_ONLY_MESSAGE;
}

/**
 * @param {typeof fetch} fetchImpl
 */
async function readGuideSeeded(fetchImpl) {
  const catalog = await fetchHouseGuideCatalog({ fetchImpl, draft: true });
  return catalog.ok && Boolean(catalog.data?.seeded);
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
    localOnlyMode = false;
    state = result.data;
    notify();
    return state;
  }

  if (result.status === 404) {
    localOnlyMode = true;
    const local = loadLocalProfile();
    const guideSeeded = await readGuideSeeded(fetchImpl);
    const { _hasLocalRow, ...profileFields } = local;
    void _hasLocalRow;
    state = {
      profile: profileFields,
      guideSeeded
    };
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
  if (result.ok) {
    localOnlyMode = false;
    if (result.data?.profile) {
      state = {
        profile: result.data.profile,
        guideSeeded: state?.guideSeeded ?? false
      };
      notify();
    }
    return { ...result, localOnly: false };
  }

  if (result.status === 404) {
    localOnlyMode = true;
    const merged = mergeLocalProfile(patch);
    const { _hasLocalRow: hasLocalRow, ...profile } = merged;
    void hasLocalRow;
    state = {
      profile,
      guideSeeded: state?.guideSeeded ?? false
    };
    notify();
    return {
      ok: true,
      status: 200,
      message: '',
      data: { ok: true, profile },
      localOnly: true
    };
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
    localOnlyMode = false;
    await refreshPrivateConfig(fetchImpl);
    return { ...result, localOnly: false };
  }

  if (result.status === 404) {
    localOnlyMode = true;
    mergeLocalSecrets(patch);
    return {
      ok: true,
      status: 200,
      message: '',
      data: { ok: true, configured: Object.fromEntries(Object.keys(patch).map((k) => [k, true])) },
      localOnly: true
    };
  }

  return result;
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchHubSecretsConfigured(fetchImpl = fetch) {
  const result = await fetchHubSecretsStatus({ fetchImpl });
  if (result.ok || result.status !== 404) {
    return result;
  }

  const secrets = loadLocalSecrets();
  return {
    ok: true,
    status: 200,
    message: '',
    data: {
      configured: Object.fromEntries(Object.keys(secrets).map((key) => [key, Boolean(secrets[key]?.trim())]))
    }
  };
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function factoryResetHub(fetchImpl = fetch) {
  resetHubSetupWizardStep();
  const result = await resetHubSite({ fetchImpl });
  if (result.ok && result.data) {
    localOnlyMode = false;
    clearLocalSetup();
    state = {
      profile: result.data.profile,
      guideSeeded: result.data.guideSeeded === true
    };
    notify();
    await refreshPrivateConfig(fetchImpl);
    return result;
  }

  if (result.status === 404) {
    localOnlyMode = true;
    clearLocalSetup();
    state = {
      profile: { ...DEFAULT_LOCAL_PROFILE },
      guideSeeded: false
    };
    notify();
    return {
      ok: true,
      status: 200,
      message: '',
      data: { profile: { ...DEFAULT_LOCAL_PROFILE }, guideSeeded: false },
      localOnly: true
    };
  }

  return result;
}
