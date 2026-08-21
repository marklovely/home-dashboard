import {
  buildTabletPreferencesPatch,
  isDefaultTabletPreferences,
  readLocalTabletPreferencesFromStorage,
  readTabletPreferencesFromProfile,
  tabletPreferencesEqual
} from '../lib/tabletPreferencesProfile.js';
import { getActiveTheme, setActiveTheme } from './themeService.js';
import { getClockFormat, getHomeScreenScale, setClockFormat, setHomeScreenScale } from './displayPreferencesService.js';
import {
  getScreensaverSetting,
  getScreensaverTimeoutMinutes,
  setScreensaverSetting,
  setScreensaverTimeoutMinutes
} from './screensaverService.js';
import {
  clearBinAlertDismissal,
  dismissBinAlertForCollection,
  getDismissedBinCollectionDate
} from './binAlertDismissalService.js';
import {
  getSiteProfileState,
  saveSiteProfile,
  subscribeToSiteProfile,
  syncSiteProfileFromServer
} from './siteProfileService.js';

export const TABLET_PREFERENCE_CHANGE_EVENT = 'home-hub-tablet-preference-change';

const PROFILE_SYNC_INTERVAL_MS = 2 * 60 * 1000;

/** @type {import('../lib/tabletPreferencesProfile.js').TabletPreferencesProfile | null} */
let lastAppliedPreferences = null;

/** @type {boolean} */
let migrationAttempted = false;

/** @type {number | null} */
let persistTimerId = null;

/** @type {number | null} */
let profileSyncTimerId = null;

/** @type {boolean} */
let syncInitialised = false;

/**
 * @param {import('../lib/tabletPreferencesProfile.js').TabletPreferencesProfile} prefs
 */
function applyTabletPreferences(prefs) {
  setActiveTheme(prefs.theme, { source: 'sync' });
  setClockFormat(prefs.clockFormat, { source: 'sync' });
  setHomeScreenScale(prefs.homeScreenScale, { source: 'sync' });
  setScreensaverSetting(prefs.screensaver, { source: 'sync' });
  setScreensaverTimeoutMinutes(prefs.screensaverTimeoutMinutes, { source: 'sync' });

  const dismissed = prefs.dismissedBinCollectionDate;
  if (dismissed) {
    dismissBinAlertForCollection(dismissed, { source: 'sync' });
  } else {
    clearBinAlertDismissal({ source: 'sync' });
  }
}

/** @returns {import('../lib/tabletPreferencesProfile.js').TabletPreferencesProfile} */
export function collectTabletPreferencesFromServices() {
  return {
    theme: getActiveTheme(),
    clockFormat: getClockFormat(),
    homeScreenScale: getHomeScreenScale(),
    screensaver: getScreensaverSetting(),
    screensaverTimeoutMinutes: getScreensaverTimeoutMinutes(),
    dismissedBinCollectionDate: getDismissedBinCollectionDate()
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 */
function applyTabletPreferencesFromProfile(profile) {
  const prefs = readTabletPreferencesFromProfile(profile);
  if (lastAppliedPreferences && tabletPreferencesEqual(lastAppliedPreferences, prefs)) {
    return;
  }

  applyTabletPreferences(prefs);
  lastAppliedPreferences = prefs;
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @param {typeof fetch} [fetchImpl]
 */
async function maybeMigrateLocalTabletPreferences(profile, fetchImpl = fetch) {
  if (migrationAttempted) return;
  migrationAttempted = true;

  const serverPrefs = readTabletPreferencesFromProfile(profile);
  const localPrefs = readLocalTabletPreferencesFromStorage();
  const shouldMigrate =
    isDefaultTabletPreferences(serverPrefs) && !tabletPreferencesEqual(serverPrefs, localPrefs);

  if (!shouldMigrate) return;

  const patch = buildTabletPreferencesPatch(localPrefs);
  const result = await saveSiteProfile(patch, fetchImpl);
  if (result.ok) {
    applyTabletPreferencesFromProfile(result.data?.profile ?? { tabletPreferences: localPrefs });
  }
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function syncTabletPreferencesFromSiteProfile(fetchImpl = fetch) {
  let state = await syncSiteProfileFromServer(fetchImpl);
  await maybeMigrateLocalTabletPreferences(state?.profile, fetchImpl);
  state = getSiteProfileState() ?? state;
  applyTabletPreferencesFromProfile(state?.profile);
  return state;
}

function schedulePersistTabletPreferences() {
  if (persistTimerId != null) {
    window.clearTimeout(persistTimerId);
  }

  persistTimerId = window.setTimeout(() => {
    persistTimerId = null;
    const patch = buildTabletPreferencesPatch(collectTabletPreferencesFromServices());
    void saveSiteProfile(patch).then((result) => {
      if (result.ok && result.data?.profile) {
        lastAppliedPreferences = readTabletPreferencesFromProfile(result.data.profile);
      }
    });
  }, 300);
}

function onTabletPreferenceChanged() {
  schedulePersistTabletPreferences();
}

function onSiteProfileUpdated() {
  applyTabletPreferencesFromProfile(getSiteProfileState()?.profile);
}

function syncProfileWhenVisible() {
  if (document.visibilityState !== 'visible') return;
  void syncSiteProfileFromServer();
}

/**
 * Call once during app startup after local preference services are initialised.
 */
export function initTabletPreferencesSync() {
  if (syncInitialised) return;
  syncInitialised = true;

  document.addEventListener(TABLET_PREFERENCE_CHANGE_EVENT, onTabletPreferenceChanged);
  subscribeToSiteProfile(onSiteProfileUpdated);

  document.addEventListener('visibilitychange', syncProfileWhenVisible);
  profileSyncTimerId = window.setInterval(syncProfileWhenVisible, PROFILE_SYNC_INTERVAL_MS);
}

/** @internal */
export function resetTabletPreferencesSyncForTests() {
  if (persistTimerId != null) {
    window.clearTimeout(persistTimerId);
    persistTimerId = null;
  }
  if (profileSyncTimerId != null) {
    window.clearInterval(profileSyncTimerId);
    profileSyncTimerId = null;
  }
  document.removeEventListener(TABLET_PREFERENCE_CHANGE_EVENT, onTabletPreferenceChanged);
  lastAppliedPreferences = null;
  migrationAttempted = false;
  syncInitialised = false;
}

/** @internal */
export function notifyTabletPreferenceChangedForTests() {
  onTabletPreferenceChanged();
}

/** @internal */
export function getLastAppliedTabletPreferencesForTests() {
  return lastAppliedPreferences;
}
