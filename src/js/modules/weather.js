import {
  startWeatherAutoRefresh,
  subscribeWeatherState
} from '../../services/weatherService.js';
import { renderWeatherIcon } from '../../weather/renderWeatherIcon.js';

/**
 * @param {HTMLElement | null} iconHost
 * @param {string} iconId
 */
function renderStatusIcon(iconHost, iconId) {
  if (!iconHost) return;
  iconHost.replaceChildren();
  iconHost.append(renderWeatherIcon(iconId, { size: 22, className: 'weather-status-icon' }));
}

/**
 * @param {{ icon?: HTMLElement | null, temp: HTMLElement, text: HTMLElement }} elements
 * @param {import('../../services/weatherService.js').WeatherState} weatherState
 */
export function applyWeatherToStatusStrip(elements, weatherState) {
  const iconHost = elements.icon instanceof HTMLElement ? elements.icon : null;

  if (weatherState.status === 'ready' && weatherState.data) {
    const { current } = weatherState.data;
    elements.temp.textContent = `${current.temperature}°`;
    elements.text.textContent = current.condition;
    renderStatusIcon(iconHost, current.icon);
    return;
  }

  if (weatherState.status === 'loading') {
    elements.temp.textContent = '…';
    elements.text.textContent = 'Loading weather';
    if (iconHost) iconHost.replaceChildren();
    return;
  }

  elements.temp.textContent = 'Weather';
  elements.text.textContent =
    weatherState.message === 'API not configured'
      ? 'API not configured'
      : 'Unavailable';
  renderStatusIcon(iconHost, 'cloudy');
}

/**
 * @param {{ icon?: HTMLElement | null, temp: HTMLElement, text: HTMLElement }} elements
 * @param {Object} [_config]
 * @param {{ fetchImpl?: typeof fetch }} [dependencies]
 */
export function initialiseWeather(elements, _config, dependencies = {}) {
  /** @type {Array<{ icon?: HTMLElement | null, temp: HTMLElement, text: HTMLElement }>} */
  const targets = [elements];
  if (dependencies.headerElements) {
    targets.push(dependencies.headerElements);
  }
  subscribeWeatherState((weatherState) => {
    for (const target of targets) {
      applyWeatherToStatusStrip(target, weatherState);
    }
  });
  startWeatherAutoRefresh(dependencies.fetchImpl);
}

/** @deprecated Use Worker-backed weather icons via condition strings. */
export function describeWeather(code) {
  const map = {
    0: { text: 'Clear', icon: 'clear' },
    2: { text: 'Partly Cloudy', icon: 'partly-cloudy' },
    3: { text: 'Overcast', icon: 'cloudy' }
  };
  return map[code] ?? { text: 'Weather', icon: 'cloudy' };
}

/** @deprecated Location is configured on the Worker. */
export async function resolveCoordinates(config) {
  if (Number.isFinite(config?.latitude) && Number.isFinite(config?.longitude)) {
    return { latitude: config.latitude, longitude: config.longitude };
  }
  return { latitude: 0, longitude: 0 };
}

/** @deprecated Use weatherService / weatherApi instead. */
export async function fetchWeather({ fetchImpl } = {}) {
  const { fetchDashboardWeather } = await import('../../api/weatherApi.js');
  const result = await fetchDashboardWeather(fetchImpl);
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
