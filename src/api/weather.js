import { resolveApiClient } from './client.js';

/**
 * @param {Object} params
 * @param {number} params.latitude
 * @param {number} params.longitude
 * @param {typeof fetch} [params.fetchImpl]
 */
export async function fetchWeatherForecast({ latitude, longitude, fetchImpl }) {
  const client = resolveApiClient(fetchImpl);
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', latitude);
  url.searchParams.set('longitude', longitude);
  url.searchParams.set('current', 'temperature_2m,weather_code');
  url.searchParams.set('timezone', 'auto');
  const response = await client.get(url);
  if (!response.ok) throw new Error('Weather request failed');
  return response.json();
}
