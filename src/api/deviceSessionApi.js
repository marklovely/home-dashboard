import { ensureApiBaseUrl, buildApiUrl } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @typedef {{ authenticated: boolean, mode: 'owner' | 'sitter', ownerSessionExpiresAt: string | null, sitterSecretsDisclosed?: boolean }} DeviceSessionPayload
 */

/**
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: true, data: DeviceSessionPayload } | { ok: false, status: number }>}
 */
export async function fetchDeviceSession(fetchImpl = fetch) {
  await ensureApiBaseUrl();
  try {
    const response = await fetchImpl(
      buildApiUrl('/api/device-session'),
      withApiCredentials({ method: 'GET', cache: 'no-store' })
    );
    if (!response.ok) {
      return { ok: false, status: response.status };
    }
    const data = /** @type {DeviceSessionPayload} */ (await response.json());
    return { ok: true, data };
  } catch {
    return { ok: false, status: 503 };
  }
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function postEnterSitterMode(fetchImpl = fetch) {
  await ensureApiBaseUrl();
  const response = await fetchImpl(
    buildApiUrl('/api/device-mode'),
    withApiCredentials({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'sitter' }),
      cache: 'no-store'
    })
  );
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  return { ok: true, data: /** @type {DeviceSessionPayload} */ (await response.json()) };
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function postLockOwner(fetchImpl = fetch) {
  await ensureApiBaseUrl();
  const response = await fetchImpl(
    buildApiUrl('/api/auth/lock'),
    withApiCredentials({ method: 'POST', cache: 'no-store' })
  );
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  return { ok: true, data: /** @type {DeviceSessionPayload} */ (await response.json()) };
}
