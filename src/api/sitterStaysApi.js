import { ensureApiBaseUrl, buildApiUrl } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @typedef {{
 *   id: string,
 *   label: string | null,
 *   emails: string[],
 *   sitStart: string,
 *   sitEnd: string,
 *   accessLeadDays: number,
 *   accessGraceDays: number,
 *   accessOpensAt: number,
 *   accessClosesAt: number,
 *   secretsOpensAt: number,
 *   secretsClosesAt: number,
 *   status: 'scheduled' | 'active' | 'completed' | 'cancelled',
 *   createdAt: number,
 *   updatedAt: number
 * }} SitterStayPayload
 */

/**
 * @typedef {{
 *   stay: SitterStayPayload,
 *   accessSyncOk?: boolean,
 *   accessSyncError?: string | null,
 *   accessSyncMessage?: string | null
 * }} SitterStayMutationPayload
 */

/**
 * @param {Record<string, unknown>} body
 * @param {typeof fetch} [fetchImpl]
 */
export async function postSitterStay(body, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-settings/sitter-stays'),
      withApiCredentials({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store'
      })
    );
    const data = /** @type {SitterStayMutationPayload & { error?: string, message?: string }>} */ (
      await response.json()
    );
    if (!response.ok) {
      return { ok: false, status: response.status, data };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 503 };
  }
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 * @param {typeof fetch} [fetchImpl]
 */
export async function putSitterStay(id, body, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/house-settings/sitter-stays/${encodeURIComponent(id)}`),
      withApiCredentials({
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store'
      })
    );
    const data = /** @type {SitterStayMutationPayload & { error?: string, message?: string }>} */ (
      await response.json()
    );
    if (!response.ok) {
      return { ok: false, status: response.status, data };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 503 };
  }
}

/**
 * @param {string} id
 * @param {typeof fetch} [fetchImpl]
 */
export async function postSitterStayCancel(id, fetchImpl = fetch) {
  return postSitterStayAction(id, 'cancel', {}, fetchImpl);
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} body
 * @param {typeof fetch} [fetchImpl]
 */
export async function postSitterStayExtend(id, body, fetchImpl = fetch) {
  return postSitterStayAction(id, 'extend', body, fetchImpl);
}

/**
 * @param {string} id
 * @param {typeof fetch} [fetchImpl]
 */
export async function postSitterStayEndNow(id, fetchImpl = fetch) {
  return postSitterStayAction(id, 'end-now', {}, fetchImpl);
}

/**
 * @param {string} id
 * @param {'cancel' | 'extend' | 'end-now'} action
 * @param {Record<string, unknown>} body
 * @param {typeof fetch} [fetchImpl]
 */
async function postSitterStayAction(id, action, body, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/house-settings/sitter-stays/${encodeURIComponent(id)}/${action}`),
      withApiCredentials({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store'
      })
    );
    const data = /** @type {SitterStayMutationPayload & { error?: string, message?: string }>} */ (
      await response.json()
    );
    if (!response.ok) {
      return { ok: false, status: response.status, data };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, status: 503 };
  }
}
