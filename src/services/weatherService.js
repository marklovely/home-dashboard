import { fetchDashboardWeather } from '../api/weatherApi.js';
import { setWeatherSnapshot } from './homeWeatherSnapshot.js';

export const WEATHER_REFRESH_MS = 15 * 60 * 1000;

/** @typedef {'idle' | 'loading' | 'ready' | 'unavailable'} WeatherLoadStatus */

/** @typedef {{ status: WeatherLoadStatus, data: import('./weatherTypes.js').DashboardWeather | null, message: string }} WeatherState */

/** @type {WeatherState} */
let state = {
  status: 'idle',
  data: null,
  message: ''
};

/** @type {Set<(state: WeatherState) => void>} */
const listeners = new Set();

/** @type {ReturnType<typeof setInterval> | null} */
let refreshTimer = null;

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

/**
 * @param {import('./weatherTypes.js').DashboardWeather} data
 */
export function buildWeatherCardSummary(data) {
  const temp = `${data.current.temperature}°`;
  const subtitleParts = [data.current.condition];
  if (data.today?.high != null && data.today?.low != null) {
    subtitleParts.push(`High ${data.today.high}° · Low ${data.today.low}°`);
  }
  if (data.dashboardAlert?.label) {
    return {
      title: temp,
      subtitle: data.dashboardAlert.label,
      condition: data.current.condition,
      icon: data.current.icon,
      alert: data.dashboardAlert
    };
  }
  return {
    title: temp,
    subtitle: subtitleParts.join(' · '),
    condition: data.current.condition,
    icon: data.current.icon,
    alert: null
  };
}

function applySnapshotFromData(data) {
  const summary = buildWeatherCardSummary(data);
  setWeatherSnapshot({
    title: summary.title,
    subtitle: summary.subtitle,
    icon: summary.icon,
    condition: summary.condition
  });
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function refreshWeather(fetchImpl = fetch) {
  state = { ...state, status: 'loading' };
  notify();

  const result = await fetchDashboardWeather(fetchImpl);
    if (result.ok) {
      state = { status: 'ready', data: result.data, message: '' };
      applySnapshotFromData(result.data);
    } else {
      if (state.data) {
        state = {
          status: 'ready',
          data: state.data,
          message: result.message
        };
      } else {
        const subtitle =
          result.message === 'API not configured'
            ? 'Set VITE_API_BASE_URL on Pages'
            : 'Weather unavailable';
        state = { status: 'unavailable', data: null, message: result.message };
        setWeatherSnapshot({ title: '—', subtitle, icon: 'cloudy', condition: '' });
      }
    }
  notify();
  return state;
}

/**
 * @param {(state: WeatherState) => void} listener
 * @returns {() => void}
 */
export function subscribeWeatherState(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

export function getWeatherState() {
  return state;
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export function startWeatherAutoRefresh(fetchImpl = fetch) {
  if (refreshTimer) return;
  void refreshWeather(fetchImpl);
  refreshTimer = setInterval(() => {
    void refreshWeather(fetchImpl);
  }, WEATHER_REFRESH_MS);
}

export function stopWeatherAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

/**
 * @param {string} iso
 */
export function formatWeatherAge(iso) {
  const updated = Date.parse(iso);
  if (!Number.isFinite(updated)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - updated) / 60000));
  if (minutes <= 1) return 'Updated just now';
  return `Updated ${minutes} minutes ago`;
}

/** @internal */
export function resetWeatherStateForTests() {
  stopWeatherAutoRefresh();
  state = { status: 'idle', data: null, message: '' };
  listeners.clear();
}
