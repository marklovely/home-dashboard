import { ensureApiBaseUrl, getApiBaseUrl } from './apiBase.js';

/** @typedef {import('../services/weatherTypes.js').DashboardWeather} DashboardWeather */

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: true, data: DashboardWeather } | { ok: false, status: number, message: string }>}
 */
/**
 * @param {Object} [options]
 * @param {'owner' | 'house-sitter'} [options.audience]
 * @param {typeof fetch} [options.fetchImpl]
 */
export async function fetchDashboardWeather({ audience = 'owner', fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API not configured' };
  }

  const query = audience === 'house-sitter' ? '?audience=house-sitter' : '';

  try {
    const response = await fetchImpl(`${base}/api/weather${query}`, { cache: 'no-store' });
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
