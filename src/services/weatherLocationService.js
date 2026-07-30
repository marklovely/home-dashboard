/**
 * @typedef {{ latitude: number, longitude: number, label: string, detail?: string | null }} WeatherLocationOverride
 */

const STORAGE_KEY = 'home-hub-weather-location';

/** @type {WeatherLocationOverride | null} */
let override = null;

/** @type {Set<() => void>} */
const listeners = new Set();

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

/** @returns {WeatherLocationOverride | null} */
export function getWeatherLocationOverride() {
  return override;
}

/** @param {WeatherLocationOverride | null} location */
export function setWeatherLocationOverride(location) {
  override = location;
  try {
    if (location) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
  notify();
}

export function clearWeatherLocationOverride() {
  setWeatherLocationOverride(null);
}

/** @param {() => void} listener */
export function subscribeToWeatherLocation(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** @returns {string} */
export function getWeatherLocationLabel() {
  return override?.label ?? 'Home default';
}

export function initWeatherLocationPreference() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    const parsed = JSON.parse(stored);
    if (
      parsed &&
      typeof parsed.latitude === 'number' &&
      typeof parsed.longitude === 'number' &&
      typeof parsed.label === 'string'
    ) {
      override = {
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        label: parsed.label,
        detail: typeof parsed.detail === 'string' ? parsed.detail : null
      };
    }
  } catch {
    /* ignore */
  }
}

/** @internal */
export function resetWeatherLocationForTests() {
  override = null;
  listeners.clear();
}
