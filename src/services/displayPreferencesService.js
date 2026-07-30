/** @typedef {'12' | '24'} ClockFormat */

const STORAGE_KEY = 'home-hub-clock-format';

/** @type {ClockFormat} */
let clockFormat = '24';

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** @returns {ClockFormat} */
export function getClockFormat() {
  return clockFormat;
}

/** @param {ClockFormat} format */
export function setClockFormat(format) {
  if (format !== '12' && format !== '24') return;
  clockFormat = format;
  try {
    localStorage.setItem(STORAGE_KEY, format);
  } catch {
    /* ignore */
  }
  notify();
}

/** @param {() => void} listener */
export function subscribeToDisplayPreferences(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initDisplayPreferences() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '12' || stored === '24') {
      clockFormat = stored;
    }
  } catch {
    /* ignore */
  }
}

/** @returns {string} */
export function clockFormatLabel() {
  return clockFormat === '12' ? '12-hour' : '24-hour';
}

/** @internal */
export function resetDisplayPreferencesForTests() {
  clockFormat = '24';
  listeners.clear();
}
