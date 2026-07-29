import { fetchWeatherForecast } from '../../api/weather.js';

const WEATHER_CODES = {
  0: ['Clear', '☀'], 1: ['Mainly clear', '◒'], 2: ['Partly cloudy', '◒'], 3: ['Overcast', '☁'],
  45: ['Fog', '≋'], 48: ['Fog', '≋'], 51: ['Drizzle', '☂'], 53: ['Drizzle', '☂'], 55: ['Drizzle', '☂'],
  61: ['Rain', '☂'], 63: ['Rain', '☂'], 65: ['Heavy rain', '☂'], 71: ['Snow', '❄'], 73: ['Snow', '❄'],
  75: ['Heavy snow', '❄'], 80: ['Showers', '☂'], 81: ['Showers', '☂'], 82: ['Heavy showers', '☂'],
  95: ['Thunderstorm', 'ϟ'], 96: ['Thunderstorm', 'ϟ'], 99: ['Thunderstorm', 'ϟ']
};

export function describeWeather(code) {
  const [text, icon] = WEATHER_CODES[code] ?? ['Weather', '◌'];
  return { text, icon };
}

export async function resolveCoordinates(config, geolocation = navigator.geolocation) {
  if (Number.isFinite(config.latitude) && Number.isFinite(config.longitude)) {
    return { latitude: config.latitude, longitude: config.longitude };
  }
  if (!geolocation) throw new Error('Location unavailable');
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 3600000 }
    );
  });
}

export async function fetchWeather({ latitude, longitude, fetchImpl }) {
  return fetchWeatherForecast({ latitude, longitude, fetchImpl });
}

export async function initialiseWeather(elements, config, dependencies = {}) {
  try {
    const coordinates = await resolveCoordinates(config, dependencies.geolocation);
    const data = await fetchWeatherForecast({ ...coordinates, fetchImpl: dependencies.fetchImpl });
    const description = describeWeather(data.current.weather_code);
    elements.temp.textContent = `${Math.round(data.current.temperature_2m)}°C`;
    elements.text.textContent = description.text;
    elements.icon.textContent = description.icon;
  } catch {
    elements.temp.textContent = 'Weather';
    elements.text.textContent = 'Location unavailable';
    elements.icon.textContent = '◌';
  }
}
