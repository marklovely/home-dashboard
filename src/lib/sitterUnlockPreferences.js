import { isOwnerAccessAllowed } from '../auth/deploymentMode.js';
import { getDeviceMode } from '../auth/deviceSessionStore.js';
import { isDemoHubEnvironment } from '../auth/hubEnvironment.js';
import { isHouseSitterExperience } from '../auth/userMode.js';
import { getSiteProfileState } from '../services/siteProfileService.js';

/** @typedef {{ logoHold: boolean, settingsButton: boolean }} SitterUnlockPreferences */

export const DEFAULT_SITTER_UNLOCK = /** @type {SitterUnlockPreferences} */ ({
  logoHold: true,
  settingsButton: true
});

/**
 * @param {unknown} value
 * @returns {SitterUnlockPreferences}
 */
export function normalizeSitterUnlock(value) {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SITTER_UNLOCK };
  }
  const raw = /** @type {Record<string, unknown>} */ (value);
  const logoHold = raw.logoHold !== false;
  const settingsButton = raw.settingsButton !== false;
  if (!logoHold && !settingsButton) {
    return { ...DEFAULT_SITTER_UNLOCK };
  }
  return { logoHold, settingsButton };
}

/**
 * @param {Record<string, unknown> | null | undefined} profile
 * @returns {SitterUnlockPreferences}
 */
export function readSitterUnlockFromProfile(profile) {
  return normalizeSitterUnlock(profile?.sitterUnlock);
}

/** @returns {SitterUnlockPreferences} */
export function getSitterUnlockPreferences() {
  return readSitterUnlockFromProfile(getSiteProfileState()?.profile);
}

/** @returns {boolean} */
export function isTabletLockedInSitterMode() {
  return getDeviceMode() === 'sitter';
}

/** @returns {boolean} */
export function canUseLogoHoldUnlock() {
  if (isDemoHubEnvironment()) return false;
  if (!isOwnerAccessAllowed()) return false;
  if (!isHouseSitterExperience()) return false;
  if (!isTabletLockedInSitterMode()) return false;
  return getSitterUnlockPreferences().logoHold;
}

/** @returns {boolean} */
export function canUseSettingsPinUnlock() {
  if (isDemoHubEnvironment()) return false;
  if (!isOwnerAccessAllowed()) return false;
  if (!isTabletLockedInSitterMode()) return false;
  return getSitterUnlockPreferences().settingsButton;
}

/**
 * Owner-facing sentence fragment for DEVICE_MODE_REQUIRED errors.
 * @returns {string}
 */
export function formatOwnerUnlockInstructions() {
  const { logoHold, settingsButton } = getSitterUnlockPreferences();
  /** @type {string[]} */
  const parts = [];
  if (logoHold) {
    parts.push('press and hold the hub logo for five seconds');
  }
  if (settingsButton) {
    parts.push('open Settings and tap Unlock owner mode');
  }
  if (!parts.length) {
    return 'unlock owner mode with your owner PIN, then try again';
  }
  return `${parts.join(', or ')}, enter your owner PIN, then try again`;
}

/**
 * @param {SitterUnlockPreferences} prefs
 * @returns {{ sitterUnlock: SitterUnlockPreferences }}
 */
export function buildSitterUnlockPatch(prefs) {
  return { sitterUnlock: normalizeSitterUnlock(prefs) };
}
