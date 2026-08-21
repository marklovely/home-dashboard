/** @typedef {'dark' | 'light' | 'auto'} TabletThemeId */

/** @typedef {'12' | '24'} TabletClockFormat */

/** @typedef {'0.9' | '1' | '1.1' | '1.2'} TabletHomeScreenScale */

/** @typedef {'off' | 'on'} TabletScreensaverSetting */

/**
 * @typedef {Object} TabletPreferencesProfile
 * @property {TabletThemeId} theme
 * @property {TabletClockFormat} clockFormat
 * @property {TabletHomeScreenScale} homeScreenScale
 * @property {TabletScreensaverSetting} screensaver
 * @property {number} screensaverTimeoutMinutes
 * @property {string | null} dismissedBinCollectionDate YYYY-MM-DD
 */

export const DEFAULT_TABLET_PREFERENCES = /** @type {TabletPreferencesProfile} */ ({
  theme: 'dark',
  clockFormat: '24',
  homeScreenScale: '1',
  screensaver: 'on',
  screensaverTimeoutMinutes: 15,
  dismissedBinCollectionDate: null
});

const SCREENSAVER_TIMEOUT_MINUTES = Object.freeze([5, 10, 15, 30]);

/**
 * @param {unknown} theme
 * @returns {TabletThemeId}
 */
function normalizeTheme(theme) {
  if (theme === 'light' || theme === 'auto') return theme;
  return 'dark';
}

/**
 * @param {unknown} format
 * @returns {TabletClockFormat}
 */
function normalizeClockFormat(format) {
  return format === '12' ? '12' : '24';
}

/**
 * @param {unknown} scale
 * @returns {TabletHomeScreenScale}
 */
function normalizeHomeScreenScale(scale) {
  if (scale === '0.9' || scale === '1.1' || scale === '1.2') return scale;
  return '1';
}

/**
 * @param {unknown} setting
 * @returns {TabletScreensaverSetting}
 */
function normalizeScreensaver(setting) {
  return setting === 'off' ? 'off' : 'on';
}

/**
 * @param {unknown} minutes
 * @returns {number}
 */
function normalizeScreensaverTimeoutMinutes(minutes) {
  const value = Number.parseInt(String(minutes ?? ''), 10);
  return SCREENSAVER_TIMEOUT_MINUTES.includes(value) ? value : DEFAULT_TABLET_PREFERENCES.screensaverTimeoutMinutes;
}

/**
 * @param {unknown} date
 * @returns {string | null}
 */
function normalizeDismissedBinCollectionDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return date;
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {TabletPreferencesProfile}
 */
export function readTabletPreferencesFromProfile(profile) {
  const raw =
    profile?.tabletPreferences && typeof profile.tabletPreferences === 'object'
      ? /** @type {Record<string, unknown>} */ (profile.tabletPreferences)
      : {};

  return {
    theme: normalizeTheme(raw.theme),
    clockFormat: normalizeClockFormat(raw.clockFormat),
    homeScreenScale: normalizeHomeScreenScale(raw.homeScreenScale),
    screensaver: normalizeScreensaver(raw.screensaver),
    screensaverTimeoutMinutes: normalizeScreensaverTimeoutMinutes(raw.screensaverTimeoutMinutes),
    dismissedBinCollectionDate: normalizeDismissedBinCollectionDate(raw.dismissedBinCollectionDate)
  };
}

/**
 * @param {TabletPreferencesProfile} prefs
 * @returns {boolean}
 */
export function isDefaultTabletPreferences(prefs) {
  return (
    prefs.theme === DEFAULT_TABLET_PREFERENCES.theme &&
    prefs.clockFormat === DEFAULT_TABLET_PREFERENCES.clockFormat &&
    prefs.homeScreenScale === DEFAULT_TABLET_PREFERENCES.homeScreenScale &&
    prefs.screensaver === DEFAULT_TABLET_PREFERENCES.screensaver &&
    prefs.screensaverTimeoutMinutes === DEFAULT_TABLET_PREFERENCES.screensaverTimeoutMinutes &&
    !prefs.dismissedBinCollectionDate
  );
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {boolean}
 */
export function profileHasStoredTabletPreferences(profile) {
  return Boolean(profile?.tabletPreferences && typeof profile.tabletPreferences === 'object');
}

/**
 * @param {TabletPreferencesProfile} a
 * @param {TabletPreferencesProfile} b
 * @returns {boolean}
 */
export function tabletPreferencesEqual(a, b) {
  return (
    a.theme === b.theme &&
    a.clockFormat === b.clockFormat &&
    a.homeScreenScale === b.homeScreenScale &&
    a.screensaver === b.screensaver &&
    a.screensaverTimeoutMinutes === b.screensaverTimeoutMinutes &&
    a.dismissedBinCollectionDate === b.dismissedBinCollectionDate
  );
}

/**
 * @param {TabletPreferencesProfile} prefs
 * @returns {{ tabletPreferences: TabletPreferencesProfile }}
 */
export function buildTabletPreferencesPatch(prefs) {
  return { tabletPreferences: { ...prefs } };
}

const THEME_STORAGE_KEY = 'home-hub-theme';
const CLOCK_STORAGE_KEY = 'home-hub-clock-format';
const HOME_SCALE_STORAGE_KEY = 'home-hub-home-scale';
const SCREENSAVER_STORAGE_KEY = 'home-hub-screensaver';
const SCREENSAVER_TIMEOUT_STORAGE_KEY = 'home-hub-screensaver-timeout-minutes';
const BIN_DISMISSAL_STORAGE_KEY = 'home-dashboard-bin-alert-dismissed';

/**
 * Reads legacy per-tablet localStorage values for one-time migration to site_profile.
 *
 * @returns {TabletPreferencesProfile}
 */
export function readLocalTabletPreferencesFromStorage() {
  /** @type {TabletPreferencesProfile} */
  const prefs = { ...DEFAULT_TABLET_PREFERENCES };

  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    prefs.theme = normalizeTheme(theme);

    const clock = localStorage.getItem(CLOCK_STORAGE_KEY);
    prefs.clockFormat = normalizeClockFormat(clock);

    const scale = localStorage.getItem(HOME_SCALE_STORAGE_KEY);
    prefs.homeScreenScale = normalizeHomeScreenScale(scale);

    const screensaver = localStorage.getItem(SCREENSAVER_STORAGE_KEY);
    prefs.screensaver = normalizeScreensaver(screensaver);

    const timeout = Number.parseInt(localStorage.getItem(SCREENSAVER_TIMEOUT_STORAGE_KEY) ?? '', 10);
    if (Number.isFinite(timeout)) {
      prefs.screensaverTimeoutMinutes = normalizeScreensaverTimeoutMinutes(timeout);
    }

    const dismissedRaw = localStorage.getItem(BIN_DISMISSAL_STORAGE_KEY);
    if (dismissedRaw) {
      const parsed = JSON.parse(dismissedRaw);
      prefs.dismissedBinCollectionDate = normalizeDismissedBinCollectionDate(parsed?.collectionDate);
    }
  } catch {
    /* ignore */
  }

  return prefs;
}
