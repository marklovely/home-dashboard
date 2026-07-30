import { isHouseSitterExperience, subscribeToUserMode } from '../auth/userMode.js';

/** @typedef {'off' | 'auto'} NightModeSetting */

const STORAGE_KEY = 'home-hub-night-mode';
const SNOOZE_STORAGE_KEY = 'home-hub-night-mode-snooze-until';

const NIGHT_START_HOUR = 0;
const NIGHT_START_MINUTE = 0;
const NIGHT_END_HOUR = 6;
const NIGHT_END_MINUTE = 0;
const WAKE_MINUTES = 5;

/** @type {NightModeSetting} */
let nightModeSetting = 'auto';

/** @type {number | null} */
let snoozeUntilMs = null;

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/**
 * @param {Date} date
 * @returns {number}
 */
function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

/**
 * @param {Date} date
 */
function isWithinNightWindow(date) {
  const now = minutesSinceMidnight(date);
  const start = NIGHT_START_HOUR * 60 + NIGHT_START_MINUTE;
  const end = NIGHT_END_HOUR * 60 + NIGHT_END_MINUTE;

  if (start === end) return false;
  if (start < end) {
    return now >= start && now < end;
  }
  return now >= start || now < end;
}

/**
 * @param {Date} [now]
 */
export function isNightModeSnoozed(now = new Date()) {
  return snoozeUntilMs != null && now.getTime() < snoozeUntilMs;
}

/**
 * @param {Date} [now]
 */
export function shouldShowNightMode(now = new Date()) {
  if (!isHouseSitterExperience()) return false;
  if (nightModeSetting !== 'auto') return false;
  if (isNightModeSnoozed(now)) return false;
  return isWithinNightWindow(now);
}

/** @returns {NightModeSetting} */
export function getNightModeSetting() {
  return nightModeSetting;
}

/** @returns {string} */
export function nightModeSettingLabel() {
  if (nightModeSetting === 'off') return 'Off';
  return 'Auto (midnight – 6am)';
}

/** @param {NightModeSetting} setting */
export function setNightModeSetting(setting) {
  if (setting !== 'off' && setting !== 'auto') return;
  nightModeSetting = setting;
  try {
    localStorage.setItem(STORAGE_KEY, setting);
  } catch {
    /* ignore */
  }
  notify();
}

export function snoozeNightMode() {
  snoozeUntilMs = Date.now() + WAKE_MINUTES * 60 * 1000;
  try {
    localStorage.setItem(SNOOZE_STORAGE_KEY, String(snoozeUntilMs));
  } catch {
    /* ignore */
  }
  notify();
}

export function clearNightModeSnooze() {
  snoozeUntilMs = null;
  try {
    localStorage.removeItem(SNOOZE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** @param {() => void} listener */
export function subscribeToNightMode(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initNightModeService() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'off' || stored === 'auto') {
      nightModeSetting = stored;
    }
    const storedSnooze = localStorage.getItem(SNOOZE_STORAGE_KEY);
    if (storedSnooze) {
      const parsed = Number.parseInt(storedSnooze, 10);
      if (Number.isFinite(parsed) && parsed > Date.now()) {
        snoozeUntilMs = parsed;
      } else {
        localStorage.removeItem(SNOOZE_STORAGE_KEY);
      }
    }
  } catch {
    /* ignore */
  }

  subscribeToUserMode(() => {
    if (!isHouseSitterExperience()) {
      clearNightModeSnooze();
    }
    notify();
  });
}

/** @internal */
export function resetNightModeForTests() {
  nightModeSetting = 'auto';
  snoozeUntilMs = null;
  listeners.clear();
}

/** @internal */
export function nightModeWindowForTests() {
  return {
    startHour: NIGHT_START_HOUR,
    startMinute: NIGHT_START_MINUTE,
    endHour: NIGHT_END_HOUR,
    endMinute: NIGHT_END_MINUTE,
    wakeMinutes: WAKE_MINUTES
  };
}

/** @internal */
export function isWithinNightWindowForTests(date) {
  return isWithinNightWindow(date);
}
