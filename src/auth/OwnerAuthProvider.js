import { ensureApiBaseUrl, buildApiUrl } from '../api/apiBase.js';
import { withApiCredentials } from '../api/accessFetch.js';

/** @typedef {'success' | 'invalid' | 'rate_limited' | 'unavailable' | 'access_required'} OwnerAuthResult */

/**
 * @typedef {{ authenticated?: boolean, mode?: string, ownerSessionExpiresAt?: string | null }} OwnerAuthSessionBody
 */

/**
 * @typedef {{ status: OwnerAuthResult, session?: OwnerAuthSessionBody | null }} OwnerAuthOutcome
 */

/**
 * @param {Response} response
 * @returns {Promise<OwnerAuthResult>}
 */
async function resultFromResponse(response) {
  if (response.status === 200) return 'success';
  if (response.status === 401) {
    try {
      const body = await response.clone().json();
      if (body?.code === 'UNAUTHENTICATED' || body?.code === 'INVALID_TOKEN') {
        return 'access_required';
      }
      if (body?.code === 'INVALID_PIN') {
        return 'invalid';
      }
    } catch {
      /* ignore */
    }
    return 'invalid';
  }
  if (response.status === 429) return 'rate_limited';
  if (response.status === 503) return 'unavailable';
  return 'unavailable';
}

/**
 * @param {string} pin
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<OwnerAuthOutcome>}
 */
export async function authenticateOwnerPin(pin, fetchImpl = fetch) {
  await ensureApiBaseUrl();

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/auth/owner'),
      withApiCredentials({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
        cache: 'no-store'
      })
    );
    if (response.status === 200) {
      try {
        const session = /** @type {OwnerAuthSessionBody} */ (await response.json());
        return { status: 'success', session };
      } catch {
        return { status: 'success', session: null };
      }
    }
    return { status: await resultFromResponse(response) };
  } catch {
    return { status: 'unavailable' };
  }
}

export const ownerAuthProvider = {
  authenticate: authenticateOwnerPin
};

/** @deprecated */
export const OwnerAuthProvider = ownerAuthProvider;
