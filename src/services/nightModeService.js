import { getClockFormat } from './displayPreferencesService.js';
import { isHouseSitterExperience, subscribeToUserMode } from '../auth/userMode.js';

/** @typedef {'off' | 'auto'} NightModeSetting */

/** @typedef {{ hour: number, minute: number }} NightModeTime */

/** @typedef {{ start: NightModeTime, end: NightModeTime }} NightModeWindow */

const STORAGE_KEY = 'home-hub-night-mode';
const START_STORAGE_KEY = 'home-hub-night-mode-start';
const END_STORAGE_KEY = 'home-hub-night-mode-end';
const SNOOZE_STORAGE_KEY = 'home-hub-night-mode-snooze-until';

const WAKE_MINUTES = 5;

/** @type {NightModeSetting} */
let nightModeSetting = 'auto';

/** @type {NightModeWindow} */
let nightModeWindow = {
  start: { hour: 0, minute: 0 },
  end: { hour: 6, minute: 0 }
};

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
 * @param {number} value
 * @param {number} min
 * @param {number} max
 */
function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/**
 * @param {unknown} value
 * @returns {NightModeTime | null}
 */
function parseStoredTime(value) {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

/**
 * @param {NightModeTime} time
 */
function serializeTime(time) {
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}

/**
 * @param {NightModeTime} time
 */
export function formatNightModeTime(time) {
  const date = new Date(2026, 0, 1, time.hour, time.minute);
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: getClockFormat() === '12'
  }).format(date);
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
  const start = nightModeWindow.start.hour * 60 + nightModeWindow.start.minute;
  const end = nightModeWindow.end.hour * 60 + nightModeWindow.end.minute;

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

/** @returns {NightModeWindow} */
export function getNightModeWindow() {
  return {
    start: { ...nightModeWindow.start },
    end: { ...nightModeWindow.end }
  };
}

/** @returns {string} */
export function nightModeScheduleLabel() {
  return `${formatNightModeTime(nightModeWindow.start)} – ${formatNightModeTime(nightModeWindow.end)}`;
}

/** @returns {string} */
export function nightModeSettingLabel() {
  if (nightModeSetting === 'off') return 'Off';
  return `Auto (${nightModeScheduleLabel()})`;
}

/**
 * @param {NightModeTime} start
 * @param {NightModeTime} end
 */
export function setNightModeWindow(start, end) {
  nightModeWindow = {
    start: {
      hour: clamp(start.hour, 0, 23),
      minute: clamp(start.minute, 0, 59)
    },
    end: {
      hour: clamp(end.hour, 0, 23),
      minute: clamp(end.minute, 0, 59)
    }
  };
  try {
    localStorage.setItem(START_STORAGE_KEY, serializeTime(nightModeWindow.start));
    localStorage.setItem(END_STORAGE_KEY, serializeTime(nightModeWindow.end));
  } catch {
    /* ignore */
  }
  notify();
}

/**
 * @param {string} startValue
 * @param {string} endValue
 * @returns {boolean}
 */
export function setNightModeWindowFromInputs(startValue, endValue) {
  const start = parseStoredTime(startValue);
  const end = parseStoredTime(endValue);
  if (!start || !end) return false;
  if (start.hour === end.hour && start.minute === end.minute) return false;
  setNightModeWindow(start, end);
  return true;
}

/** @returns {{ start: string, end: string }} */
export function getNightModeWindowInputValues() {
  return {
    start: serializeTime(nightModeWindow.start),
    end: serializeTime(nightModeWindow.end)
  };
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
    const storedStart = parseStoredTime(localStorage.getItem(START_STORAGE_KEY) ?? '');
    const storedEnd = parseStoredTime(localStorage.getItem(END_STORAGE_KEY) ?? '');
    if (storedStart && storedEnd) {
      if (storedStart.hour !== storedEnd.hour || storedStart.minute !== storedEnd.minute) {
        nightModeWindow = { start: storedStart, end: storedEnd };
      }
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
  nightModeWindow = {
    start: { hour: 0, minute: 0 },
    end: { hour: 6, minute: 0 }
  };
  snoozeUntilMs = null;
  listeners.clear();
}

/** @internal */
export function isWithinNightWindowForTests(date) {
  return isWithinNightWindow(date);
}

/** @internal */
export function setNightModeWindowForTests(start, end) {
  setNightModeWindow(start, end);
}
