import { defineApp } from '../../components/App/defineApp.js';
import {
  formatWeatherAge,
  getWeatherState,
  refreshWeather,
  subscribeWeatherState
} from '../../services/weatherService.js';
import { getWeatherSnapshot } from '../../services/homeWeatherSnapshot.js';
import { isHouseSitterMode } from '../../modes/modeConfig.js';
import { isHouseSitterExperience } from '../../auth/userMode.js';
import { renderWeatherIcon } from '../../weather/renderWeatherIcon.js';
import { renderSevenDayForecast } from '../../weather/renderSevenDayForecast.js';

/**
 * @param {HTMLElement} parent
 * @param {string} label
 * @param {string} value
 */
function statCell(parent, label, value) {
  const cell = document.createElement('div');
  cell.className = 'weather-stat';
  cell.innerHTML = `<span class="weather-stat-label">${label}</span><strong class="weather-stat-value">${value}</strong>`;
  parent.append(cell);
}

/**
 * @param {import('../../services/weatherTypes.js').DashboardWeather} data
 * @param {HTMLElement} page
 */
function renderWeatherPage(data, page) {
  page.replaceChildren();
  page.className = 'app-page weather-app weather-app--premium';

  const meta = document.createElement('p');
  meta.className = 'weather-meta subtle';
  const age = formatWeatherAge(data.meta.updatedAt);
  meta.textContent = data.meta.stale ? `${age} · showing last good forecast` : age;

  const currentSection = document.createElement('section');
  currentSection.className = 'weather-section weather-current-section';
  currentSection.setAttribute('aria-label', 'Current conditions');

  const hero = document.createElement('div');
  hero.className = 'weather-current-hero';
  const iconWrap = document.createElement('div');
  iconWrap.className = 'weather-current-icon';
  iconWrap.append(renderWeatherIcon(data.current.icon, { size: 72, className: 'weather-hero-svg' }));
  const temp = document.createElement('p');
  temp.className = 'weather-current-temp';
  temp.textContent = `${data.current.temperature}°`;
  const condition = document.createElement('p');
  condition.className = 'weather-current-condition';
  condition.textContent = data.current.condition;
  const feels = document.createElement('p');
  feels.className = 'weather-current-feels subtle';
  feels.textContent = `Feels like ${data.current.feelsLike}°`;
  hero.append(iconWrap, temp, condition, feels);

  const stats = document.createElement('div');
  stats.className = 'weather-current-stats';
  statCell(stats, 'Wind', `${data.current.windDirection} ${data.current.windSpeed} mph`);
  statCell(stats, 'Humidity', `${data.current.humidity}%`);
  statCell(stats, 'UV index', String(data.current.uvIndex));
  statCell(stats, 'Air quality', data.current.airQuality);
  statCell(stats, 'Sunrise', data.today.sunrise || '—');
  statCell(stats, 'Sunset', data.today.sunset || '—');

  currentSection.append(hero, stats);

  const todaySection = document.createElement('section');
  todaySection.className = 'weather-section';
  todaySection.innerHTML = '<h2 class="weather-section-title">Today\'s summary</h2>';
  const todayGrid = document.createElement('div');
  todayGrid.className = 'weather-today-grid';
  statCell(todayGrid, 'High', `${data.today.high}°`);
  statCell(todayGrid, 'Low', `${data.today.low}°`);
  statCell(todayGrid, 'Rain', `${data.today.rainChance}%`);
  todaySection.append(todayGrid);

  const hourlySection = document.createElement('section');
  hourlySection.className = 'weather-section';
  hourlySection.innerHTML = '<h2 class="weather-section-title">Hourly forecast</h2>';
  const hourlyTrack = document.createElement('div');
  hourlyTrack.className = 'weather-hourly-track';
  for (const hour of data.hourly) {
    const card = document.createElement('article');
    card.className = 'weather-hourly-card';
    const icon = renderWeatherIcon(hour.icon, { size: 28 });
    card.append(
      Object.assign(document.createElement('span'), { className: 'weather-hourly-time', textContent: hour.label }),
      icon,
      Object.assign(document.createElement('strong'), { className: 'weather-hourly-temp', textContent: `${hour.temperature}°` }),
      Object.assign(document.createElement('span'), { className: 'subtle', textContent: `${hour.rainChance}% rain` }),
      Object.assign(document.createElement('span'), { className: 'subtle', textContent: `${hour.windSpeed} mph` })
    );
    hourlyTrack.append(card);
  }
  hourlySection.append(hourlyTrack);

  const adviceSection = document.createElement('section');
  adviceSection.className = 'weather-section weather-advice-section';
  adviceSection.innerHTML = `<h2 class="weather-section-title">${isHouseSitterExperience() ? 'Advice for Scooter' : 'Weather advice'}</h2>`;
  const adviceList = document.createElement('div');
  adviceList.className = 'weather-advice-list';
  for (const item of data.advice) {
    const card = document.createElement('article');
    card.className = 'weather-advice-card';
    card.append(
      renderWeatherIcon(item.icon, { size: 32, className: 'weather-advice-icon' }),
      Object.assign(document.createElement('div'), {
        className: 'weather-advice-copy',
        innerHTML: `<strong>${item.title}</strong><p class="subtle">${item.detail}</p>`
      })
    );
    adviceList.append(card);
  }
  adviceSection.append(adviceList);

  const dailySection = renderSevenDayForecast(data.daily, data.current.temperature);

  page.append(meta, adviceSection, currentSection, todaySection, hourlySection, dailySection);
}

/**
 * @param {HTMLElement} page
 * @param {string} title
 * @param {string} detail
 * @param {string} [updatedLabel]
 */
function renderUnavailable(page, title, detail, updatedLabel) {
  page.replaceChildren();
  page.className = 'app-page weather-app weather-offline';
  const block = document.createElement('div');
  block.className = 'weather-unavailable';
  block.innerHTML = `<h2>${title}</h2><p>${detail}</p>`;
  if (updatedLabel) {
    const updated = document.createElement('p');
    updated.className = 'subtle';
    updated.textContent = updatedLabel;
    block.append(updated);
  }
  page.append(block);
}

/**
 * @param {HTMLElement} viewport
 */
function mountWeatherDetail(viewport) {
  viewport.replaceChildren();
  const page = document.createElement('section');
  page.className = 'app-page weather-app';
  page.setAttribute('aria-label', 'Weather');
  page.innerHTML = '<p class="weather-status subtle">Loading forecast…</p>';
  viewport.append(page);

  const renderFromState = () => {
    const state = getWeatherState();
    if (state.status === 'loading' || state.status === 'idle') return;
    if (state.status === 'ready' && state.data) {
      renderWeatherPage(state.data, page);
      return;
    }
    const last = state.data;
    if (last) {
      renderWeatherPage(last, page);
      return;
    }
    renderUnavailable(page, 'Weather currently unavailable.', state.message || 'Please try again later.');
  };

  const unsubscribe = subscribeWeatherState(renderFromState);
  void refreshWeather().finally(renderFromState);

  return () => unsubscribe();
}

export const weatherApp = defineApp({
  id: 'weather',
  title: 'Weather',
  iconId: 'cloud-sun',
  description: 'Forecast and intelligent advice for home',
  capabilities: ['forecast', 'current-conditions', 'advice'],
  accent: '#4da8ff',
  profiles: ['owner', 'housesitter'],
  summary: () => {
    const snapshot = getWeatherSnapshot();
    if (isHouseSitterMode() && snapshot.subtitle?.includes('unavailable')) {
      return { title: 'Weather', subtitle: 'Tap for forecast' };
    }
    return { title: snapshot.title, subtitle: snapshot.subtitle };
  },
  mount(viewport) {
    return mountWeatherDetail(viewport);
  }
});
