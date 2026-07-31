import { ensureApiBaseUrl, buildApiUrl } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @typedef {{ sitterSecretsDisclosed: boolean }} HouseSettingsPayload
 */

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: true, data: HouseSettingsPayload } | { ok: false, status: number }>}
 */
export async function fetchHouseSettings(fetchImpl = fetch) {
  await ensureApiBaseUrl();
  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-settings'),
      withApiCredentials({ method: 'GET', cache: 'no-store' })
    );
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    return { ok: true, data: /** @type {HouseSettingsPayload} */ (await response.json()) };
  } catch {
    return { ok: false, status: 503 };
  }
}

/**
 * @param {boolean} disclosed
 * @param {typeof fetch} [fetchImpl]
 */
export async function postSitterSecretsDisclosed(disclosed, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-settings/sitter-secrets'),
      withApiCredentials({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disclosed }),
        cache: 'no-store'
      })
    );
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    return { ok: true, data: /** @type {HouseSettingsPayload} */ (await response.json()) };
  } catch {
    return { ok: false, status: 503 };
  }
}
