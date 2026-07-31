import { isHouseSitterExperience, subscribeToUserMode } from '../auth/userMode.js';

/** @typedef {'off' | 'on'} ScreensaverSetting */

const SETTING_STORAGE_KEY = 'home-hub-screensaver';
const TIMEOUT_STORAGE_KEY = 'home-hub-screensaver-timeout-minutes';
const LEGACY_NIGHT_MODE_KEY = 'home-hub-night-mode';

export const SCREENSAVER_TIMEOUT_OPTIONS = Object.freeze([
  { minutes: 5, label: '5 minutes' },
  { minutes: 10, label: '10 minutes' },
  { minutes: 15, label: '15 minutes' },
  { minutes: 30, label: '30 minutes' }
]);

const DEFAULT_TIMEOUT_MINUTES = 15;

/** @type {ScreensaverSetting} */
let screensaverSetting = 'on';

/** @type {number} */
let timeoutMinutes = DEFAULT_TIMEOUT_MINUTES;

/** @type {number} */
let lastActivityMs = Date.now();

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @param {number} value
 */
function normalizeTimeoutMinutes(value) {
  const allowed = SCREENSAVER_TIMEOUT_OPTIONS.map((option) => option.minutes);
  return allowed.includes(value) ? value : DEFAULT_TIMEOUT_MINUTES;
}

/** @returns {ScreensaverSetting} */
export function getScreensaverSetting() {
  return screensaverSetting;
}

/** @returns {number} */
export function getScreensaverTimeoutMinutes() {
  return timeoutMinutes;
}

/** @returns {string} */
export function screensaverSettingLabel() {
  if (screensaverSetting === 'off') return 'Off';
  const option = SCREENSAVER_TIMEOUT_OPTIONS.find((entry) => entry.minutes === timeoutMinutes);
  return `On (after ${option?.label ?? `${timeoutMinutes} minutes`})`;
}

/**
 * @param {Date} [now]
 */
export function shouldShowScreensaver(now = new Date()) {
  if (!isHouseSitterExperience()) return false;
  if (screensaverSetting !== 'on') return false;
  return now.getTime() - lastActivityMs >= timeoutMinutes * 60 * 1000;
}

/** @param {number} [nowMs] */
export function recordScreensaverActivity(nowMs = Date.now()) {
  lastActivityMs = nowMs;
  notify();
}

export function wakeScreensaver() {
  recordScreensaverActivity();
}

/** @param {ScreensaverSetting} setting */
export function setScreensaverSetting(setting) {
  if (setting !== 'off' && setting !== 'on') return;
  screensaverSetting = setting;
  if (setting === 'on') {
    recordScreensaverActivity();
  }
  try {
    localStorage.setItem(SETTING_STORAGE_KEY, setting);
  } catch {
    /* ignore */
  }
  notify();
}

/** @param {number} minutes */
export function setScreensaverTimeoutMinutes(minutes) {
  timeoutMinutes = normalizeTimeoutMinutes(minutes);
  try {
    localStorage.setItem(TIMEOUT_STORAGE_KEY, String(timeoutMinutes));
  } catch {
    /* ignore */
  }
  notify();
}

/** @param {() => void} listener */
export function subscribeToScreensaver(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function migrateLegacyNightModeSetting() {
  try {
    if (localStorage.getItem(SETTING_STORAGE_KEY)) return;
    const legacy = localStorage.getItem(LEGACY_NIGHT_MODE_KEY);
    if (legacy === 'off') {
      localStorage.setItem(SETTING_STORAGE_KEY, 'off');
    } else if (legacy === 'auto') {
      localStorage.setItem(SETTING_STORAGE_KEY, 'on');
    }
  } catch {
    /* ignore */
  }
}

export function initScreensaverService() {
  migrateLegacyNightModeSetting();
  try {
    const storedSetting = localStorage.getItem(SETTING_STORAGE_KEY);
    if (storedSetting === 'off' || storedSetting === 'on') {
      screensaverSetting = storedSetting;
    }
    const storedTimeout = Number.parseInt(localStorage.getItem(TIMEOUT_STORAGE_KEY) ?? '', 10);
    if (Number.isFinite(storedTimeout)) {
      timeoutMinutes = normalizeTimeoutMinutes(storedTimeout);
    }
  } catch {
    /* ignore */
  }

  recordScreensaverActivity();

  subscribeToUserMode(() => {
    if (!isHouseSitterExperience()) {
      recordScreensaverActivity();
    }
    notify();
  });
}

/** @internal */
export function resetScreensaverForTests() {
  screensaverSetting = 'on';
  timeoutMinutes = DEFAULT_TIMEOUT_MINUTES;
  lastActivityMs = Date.now();
  listeners.clear();
}

/** @internal */
export function setLastActivityForTests(timestampMs) {
  lastActivityMs = timestampMs;
}

/** @internal */
export function screensaverTimeoutMsForTests() {
  return timeoutMinutes * 60 * 1000;
}
