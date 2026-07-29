import { ensureApiBaseUrl, buildApiUrl } from '../api/apiBase.js';
import { withApiCredentials } from '../api/accessFetch.js';
import { setOwnerAccessToken } from './ownerAccessToken.js';

/** @typedef {'success' | 'invalid' | 'rate_limited' | 'unavailable'} OwnerAuthResult */

/**
 * @param {Response} response
 * @returns {Promise<OwnerAuthResult>}
 */
async function resultFromResponse(response) {
  if (response.status === 200) return 'success';
  if (response.status === 401) return 'invalid';
  if (response.status === 429) return 'rate_limited';
  if (response.status === 503) return 'unavailable';
  return 'unavailable';
}

/**
 * @param {string} pin
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<OwnerAuthResult>}
 */
export async function authenticateOwnerPin(pin, fetchImpl = fetch) {
  await ensureApiBaseUrl();

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/auth/owner'),
      withApiCredentials({
        method: 'POST',
        body: JSON.stringify({ pin }),
        cache: 'no-store'
      })
    );
    if (response.status === 200) {
      try {
        const body = await response.json();
        if (body?.token && body?.expiresAt) {
          setOwnerAccessToken(body.token, body.expiresAt);
        }
      } catch {
        /* token optional for backwards compatibility */
      }
      return 'success';
    }
    return resultFromResponse(response);
  } catch {
    return 'unavailable';
  }
}

export const ownerAuthProvider = {
  authenticate: authenticateOwnerPin
};

/** @deprecated */
export const OwnerAuthProvider = ownerAuthProvider;
