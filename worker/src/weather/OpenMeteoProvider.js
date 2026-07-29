import { mapOpenMeteoToDashboard } from './mapOpenMeteo.js';

/**
 * @param {import('./WeatherProvider.js').WeatherProviderConfig} config
 * @returns {import('./WeatherProvider.js').WeatherProvider}
 */
export function createOpenMeteoProvider(config) {
  const { latitude, longitude } = config;

  return {
    async fetchRawForecast(fetchImpl = fetch) {
      const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
      forecastUrl.searchParams.set('latitude', String(latitude));
      forecastUrl.searchParams.set('longitude', String(longitude));
      forecastUrl.searchParams.set(
        'current',
        'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,uv_index'
      );
      forecastUrl.searchParams.set(
        'hourly',
        'temperature_2m,weather_code,precipitation_probability,wind_speed_10m'
      );
      forecastUrl.searchParams.set(
        'daily',
        'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'
      );
      forecastUrl.searchParams.set('forecast_days', '7');
      forecastUrl.searchParams.set('timezone', 'Europe/London');
      forecastUrl.searchParams.set('wind_speed_unit', 'mph');

      const airUrl = new URL('https://air-quality-api.open-meteo.com/v1/air-quality');
      airUrl.searchParams.set('latitude', String(latitude));
      airUrl.searchParams.set('longitude', String(longitude));
      airUrl.searchParams.set('current', 'european_aqi');

      const [forecastResponse, airResponse] = await Promise.all([
        fetchImpl(forecastUrl),
        fetchImpl(airUrl).catch(() => null)
      ]);

      if (!forecastResponse.ok) {
        throw new Error('Open-Meteo forecast request failed');
      }

      const forecast = await forecastResponse.json();
      let airQuality = null;
      if (airResponse?.ok) {
        airQuality = await airResponse.json();
      }

      return { forecast, airQuality };
    }
  };
}

/**
 * @param {import('./WeatherProvider.js').WeatherProvider} provider
 * @param {typeof fetch} fetchImpl
 * @param {{ fetchedAt: string, fromCache: boolean, stale: boolean }} meta
 */
export async function fetchDashboardWeatherFromOpenMeteo(provider, fetchImpl, meta) {
  const { forecast, airQuality } = await provider.fetchRawForecast(fetchImpl);
  return mapOpenMeteoToDashboard(forecast, airQuality, meta);
}
