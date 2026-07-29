import { ensureApiBaseUrl, getApiBaseUrl } from './apiBase.js';

/** @typedef {import('../services/weatherTypes.js').DashboardWeather} DashboardWeather */

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: true, data: DashboardWeather } | { ok: false, status: number, message: string }>}
 */
export async function fetchDashboardWeather(fetchImpl = fetch) {
  await ensureApiBaseUrl();
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 0, message: 'API not configured' };
  }

  try {
    const response = await fetchImpl(`${base}/api/weather`, { cache: 'no-store' });
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
