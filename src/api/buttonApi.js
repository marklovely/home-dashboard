import { ensureApiBaseUrl, buildApiUrl } from './apiBase.js';
import { resolveApiClient } from './client.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @param {number} buttonId Virtual Buttons numeric ID from dashboard config.
 * @returns {string}
 */
export function formatButtonCode(buttonId) {
  if (!Number.isInteger(buttonId) || buttonId < 1) {
    throw new Error('Button ID must be a positive integer.');
  }
  return `VB${String(buttonId).padStart(2, '0')}`;
}

/**
 * @param {string} buttonCode e.g. VB01
 * @param {typeof fetch} [fetchImpl]
 */
export async function pressButton(buttonCode, fetchImpl) {
  await ensureApiBaseUrl();
  const normalized = buttonCode.trim().toUpperCase();
  const client = resolveApiClient(fetchImpl);
  const url = buildApiUrl(`/api/button/${encodeURIComponent(normalized)}`);
  const response = await client.post(url, withApiCredentials({ cache: 'no-store', body: '{}' }));
  if (!response.ok) {
    let message = 'Could not trigger this control.';
    try {
      const body = await response.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }
  return true;
}

/**
 * @param {number} buttonId
 * @param {typeof fetch} [fetchImpl]
 */
export async function pressButtonById(buttonId, fetchImpl) {
  return pressButton(formatButtonCode(buttonId), fetchImpl);
}

export const buttonApi = {
  press: pressButton,
  pressById: pressButtonById,
  formatCode: formatButtonCode
};
