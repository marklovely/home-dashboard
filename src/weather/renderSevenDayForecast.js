import { renderWeatherIcon } from './renderWeatherIcon.js';

/**
 * @param {import('../services/weatherTypes.js').WeatherDaily[]} daily
 */
export function computeWeekTemperatureSpan(daily) {
  const lows = daily.map((day) => day.low);
  const highs = daily.map((day) => day.high);
  const weekMin = Math.min(...lows);
  const weekMax = Math.max(...highs);
  const span = Math.max(1, weekMax - weekMin);
  return { weekMin, weekMax, span };
}

/**
 * @param {import('../services/weatherTypes.js').WeatherDaily} day
 * @param {number} weekMin
 * @param {number} span
 */
export function dailyBarStyle(day, weekMin, span) {
  const start = ((day.low - weekMin) / span) * 100;
  const width = Math.max(((day.high - day.low) / span) * 100, 6);
  return { start, width };
}

/**
 * @param {import('../services/weatherTypes.js').WeatherDaily[]} daily
 * @param {number | null | undefined} currentTemperature
 * @returns {HTMLElement}
 */
export function renderSevenDayForecast(daily, currentTemperature) {
  const section = document.createElement('section');
  section.className = 'weather-section weather-daily-section';
  section.innerHTML = '<h2 class="weather-section-title">7-Day Forecast</h2>';

  const list = document.createElement('div');
  list.className = 'weather-daily-list';
  list.setAttribute('role', 'list');

  const { weekMin, span } = computeWeekTemperatureSpan(daily);

  for (const day of daily) {
    const row = document.createElement('div');
    row.className = 'weather-daily-row';
    row.setAttribute('role', 'listitem');

    const label = document.createElement('span');
    label.className = 'weather-daily-label';
    label.textContent = day.label;

    const iconStack = document.createElement('div');
    iconStack.className = 'weather-daily-icon-stack';
    iconStack.append(renderWeatherIcon(day.icon, { size: 24, className: 'weather-daily-icon-svg' }));
    if (day.rainChance >= 15) {
      const rainBadge = document.createElement('span');
      rainBadge.className = 'weather-daily-rain-badge';
      rainBadge.textContent = `${day.rainChance}%`;
      rainBadge.setAttribute('aria-label', `${day.rainChance} percent chance of rain`);
      iconStack.append(rainBadge);
    }

    const low = document.createElement('span');
    low.className = 'weather-daily-low';
    low.textContent = `${day.low}°`;

    const barTrack = document.createElement('div');
    barTrack.className = 'weather-daily-bar';
    barTrack.setAttribute(
      'aria-label',
      `${day.label}: low ${day.low}, high ${day.high}, ${day.rainChance} percent chance of rain`
    );
    const { start, width } = dailyBarStyle(day, weekMin, span);
    const barFill = document.createElement('div');
    barFill.className = 'weather-daily-bar-fill';
    barFill.style.setProperty('--bar-start', `${start}%`);
    barFill.style.setProperty('--bar-width', `${width}%`);
    barTrack.append(barFill);

    if (day.label === 'Today' && Number.isFinite(currentTemperature)) {
      const marker = document.createElement('span');
      marker.className = 'weather-daily-bar-marker';
      const markerPos = Math.min(100, Math.max(0, ((currentTemperature - weekMin) / span) * 100));
      marker.style.setProperty('--marker-pos', `${markerPos}%`);
      marker.setAttribute('aria-hidden', 'true');
      barTrack.append(marker);
    }

    const high = document.createElement('span');
    high.className = 'weather-daily-high';
    high.textContent = `${day.high}°`;

    row.append(label, iconStack, low, barTrack, high);
    list.append(row);
  }

  section.append(list);
  return section;
}
