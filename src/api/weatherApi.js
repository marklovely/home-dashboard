import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';
import { getWeatherLocationOverride } from '../services/weatherLocationService.js';

/** @typedef {import('../services/weatherTypes.js').DashboardWeather} DashboardWeather */

/**
 * @typedef {{ latitude: number, longitude: number, label: string, detail?: string | null }} WeatherGeocodeResult
 */

/**
 * @param {Object} [options]
 * @param {'owner' | 'house-sitter'} [options.audience]
 * @param {typeof fetch} [options.fetchImpl]
 */
export async function fetchDashboardWeather({ audience = 'owner', fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 0, message: 'API not configured' };
  }

  const params = new URLSearchParams();
  if (audience === 'house-sitter') {
    params.set('audience', 'house-sitter');
  }

  const override = getWeatherLocationOverride();
  if (override) {
    params.set('lat', String(override.latitude));
    params.set('lon', String(override.longitude));
  }

  const query = params.size ? `?${params.toString()}` : '';

  try {
    const response = await fetchImpl(buildApiUrl(`/api/weather${query}`), withApiCredentials({ cache: 'no-store' }));
    const body = await response.json();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: body?.error ?? 'Weather currently unavailable.'
      };
    }
    return { ok: true, data: /** @type {DashboardWeather} */ (body) };
  } catch {
    return { ok: false, status: 0, message: 'Weather currently unavailable.' };
  }
}

/**
 * @param {string} query
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: true, results: WeatherGeocodeResult[] } | { ok: false, status: number, message: string }>}
 */
export async function geocodeWeatherLocation(query, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 0, message: 'API not configured' };
  }

  const trimmed = query.trim();
  if (!trimmed) {
    return { ok: false, status: 400, message: 'Enter a postcode or place name.' };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/weather/geocode?q=${encodeURIComponent(trimmed)}`),
      withApiCredentials({ cache: 'no-store' })
    );
    const body = await response.json();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: body?.error ?? 'Location lookup failed.'
      };
    }
    return { ok: true, results: /** @type {WeatherGeocodeResult[]} */ (body.results ?? []) };
  } catch {
    return { ok: false, status: 0, message: 'Location lookup failed.' };
  }
}
