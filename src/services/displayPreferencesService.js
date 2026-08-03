/** @typedef {'12' | '24'} ClockFormat */

/** @typedef {'0.9' | '1' | '1.1' | '1.2'} HomeScreenScale */

const CLOCK_STORAGE_KEY = 'home-hub-clock-format';
const HOME_SCALE_STORAGE_KEY = 'home-hub-home-scale';

/** @type {ClockFormat} */
let clockFormat = '24';

/** @type {HomeScreenScale} */
let homeScreenScale = '1';

/** @type {Set<() => void>} */
const listeners = new Set();

/** @type {Array<{ id: HomeScreenScale, label: string }>} */
export const HOME_SCREEN_SCALE_OPTIONS = [
  { id: '0.9', label: 'Smaller' },
  { id: '1', label: 'Default' },
  { id: '1.1', label: 'Larger' },
  { id: '1.2', label: 'Extra large' }
];

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function applyHomeScreenScale() {
  document.documentElement.style.setProperty('--home-ui-scale', homeScreenScale);
  document.documentElement.dataset.homeUiScale = homeScreenScale;
}

/** @returns {ClockFormat} */
export function getClockFormat() {
  return clockFormat;
}

/** @returns {HomeScreenScale} */
export function getHomeScreenScale() {
  return homeScreenScale;
}

/** @param {ClockFormat} format */
export function setClockFormat(format) {
  if (format !== '12' && format !== '24') return;
  clockFormat = format;
  try {
    localStorage.setItem(CLOCK_STORAGE_KEY, format);
  } catch {
    /* ignore */
  }
  notify();
}

/** @param {HomeScreenScale} scale */
export function setHomeScreenScale(scale) {
  if (!HOME_SCREEN_SCALE_OPTIONS.some((option) => option.id === scale)) return;
  homeScreenScale = scale;
  applyHomeScreenScale();
  try {
    localStorage.setItem(HOME_SCALE_STORAGE_KEY, scale);
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
    const storedClock = localStorage.getItem(CLOCK_STORAGE_KEY);
    if (storedClock === '12' || storedClock === '24') {
      clockFormat = storedClock;
    }
    const storedScale = localStorage.getItem(HOME_SCALE_STORAGE_KEY);
    if (HOME_SCREEN_SCALE_OPTIONS.some((option) => option.id === storedScale)) {
      homeScreenScale = /** @type {HomeScreenScale} */ (storedScale);
    }
  } catch {
    /* ignore */
  }
  applyHomeScreenScale();
}

/** @returns {string} */
export function clockFormatLabel() {
  return clockFormat === '12' ? '12-hour' : '24-hour';
}

/** @returns {string} */
export function homeScreenScaleLabel() {
  return HOME_SCREEN_SCALE_OPTIONS.find((option) => option.id === homeScreenScale)?.label ?? 'Default';
}

/** @internal */
export function resetDisplayPreferencesForTests() {
  clockFormat = '24';
  homeScreenScale = '1';
  applyHomeScreenScale();
  listeners.clear();
}
