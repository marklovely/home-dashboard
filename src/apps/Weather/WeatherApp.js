import { defineApp } from '../../components/App/defineApp.js';
import { fetchWeatherForecast } from '../../api/weather.js';
import { describeWeather, resolveCoordinates } from '../../js/modules/weather.js';
import { getWeatherSnapshot } from '../../services/homeWeatherSnapshot.js';
import { isHouseSitterMode } from '../../modes/modeConfig.js';

/**
 * @param {HTMLElement} host
 * @param {string} label
 * @param {string} temp
 * @param {string} detail
 */
function renderForecastRow(host, label, temp, detail) {
  const row = document.createElement('div');
  row.className = 'weather-forecast-row';
  row.innerHTML = `<span class="weather-forecast-label">${label}</span><strong class="weather-forecast-temp">${temp}</strong><span class="weather-forecast-detail">${detail}</span>`;
  host.append(row);
}

/**
 * @param {HTMLElement} viewport
 * @param {import('../../types/app.js').ShellContext} context
 */
async function mountWeatherDetail(viewport, context) {
  viewport.replaceChildren();
  const page = document.createElement('section');
  page.className = 'app-page weather-app';
  page.setAttribute('aria-label', 'Weather');

  const status = document.createElement('p');
  status.className = 'weather-status subtle';
  status.textContent = 'Loading forecast…';
  page.append(status);
  viewport.append(page);

  try {
    const coordinates = await resolveCoordinates(context.config.weather);
    const data = await fetchWeatherForecast(coordinates);
    const current = describeWeather(data.current.weather_code);
    page.replaceChildren();

    const hero = document.createElement('div');
    hero.className = 'weather-hero';
    hero.innerHTML = `<span class="weather-hero-icon">${current.icon}</span><p class="weather-hero-temp">${Math.round(data.current.temperature_2m)}°C</p><p class="weather-hero-text">${current.text}</p>`;

    const list = document.createElement('div');
    list.className = 'weather-forecast-list';

    const daily = data.daily;
    if (daily?.time?.length) {
      const labels = ['Today', 'Tomorrow', 'Day after'];
      for (let index = 0; index < Math.min(3, daily.time.length); index += 1) {
        const code = daily.weather_code[index];
        const description = describeWeather(code);
        const max = Math.round(daily.temperature_2m_max[index]);
        const min = Math.round(daily.temperature_2m_min[index]);
        renderForecastRow(list, labels[index] ?? daily.time[index], `${max}°`, `${description.text} · low ${min}°`);
      }
    }

    page.append(hero, list);
  } catch {
    page.replaceChildren();
    const friendly = document.createElement('div');
    friendly.className = 'weather-offline';
    friendly.innerHTML =
      '<h2>Weather unavailable</h2><p>We could not load a forecast right now. House Guide, Scooter, Emergency, and Home Controls still work offline.</p>';
    page.append(friendly);
  }
}

export const weatherApp = defineApp({
  id: 'weather',
  title: 'Weather',
  iconId: 'cloud-sun',
  description: 'Forecast and current conditions',
  capabilities: ['forecast', 'current-conditions'],
  accent: '#4da8ff',
  profiles: ['owner', 'housesitter'],
  summary: () => {
    const snapshot = getWeatherSnapshot();
    if (isHouseSitterMode() && snapshot.subtitle?.includes('unavailable')) {
      return { title: 'Weather', subtitle: 'Tap for forecast' };
    }
    return snapshot;
  },
  mount(viewport, context) {
    void mountWeatherDetail(viewport, context);
  }
});
