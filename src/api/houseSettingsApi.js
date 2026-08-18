import { ensureApiBaseUrl, buildApiUrl } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @typedef {{
 *   sitterSecretsDisclosed: boolean,
 *   sitterAccessEmails?: string[],
 *   accessSitterSyncConfigured?: boolean,
 *   accessSyncOk?: boolean,
 *   accessSyncError?: string,
 *   accessSyncMessage?: string | null
 * }} HouseSettingsPayload
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

/**
 * @param {string[]} emails
 * @param {typeof fetch} [fetchImpl]
 */
export async function postSitterAccessEmails(emails, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-settings/sitter-emails'),
      withApiCredentials({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails }),
        cache: 'no-store'
      })
    );
    const data = /** @type {HouseSettingsPayload} */ (await response.json());
    if (!response.ok) {
      return { ok: false, status: response.status, data };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 503 };
  }
}
