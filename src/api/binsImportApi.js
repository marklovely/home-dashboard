import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @param {{
 *   postcode: string,
 *   councilId?: string | null,
 *   uprn?: string | null,
 *   line1?: string,
 *   line2?: string,
 *   city?: string,
 *   address?: string
 * }} payload
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchBinsImportSchedule(payload, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 0, message: 'API not configured' };
  }

  try {
    const response = await fetchImpl(buildApiUrl('/api/bins/import-schedule'), {
      ...withApiCredentials({ cache: 'no-store' }),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: body?.code,
        message: body?.error ?? 'Import failed.'
      };
    }
    return { ok: true, data: body };
  } catch {
    return { ok: false, status: 0, message: 'Import failed.' };
  }
}

/**
 * @param {string} text
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchBinsParseDatesAi(text, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 0, message: 'API not configured' };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, status: 400, message: 'Nothing to parse.' };
  }

  try {
    const response = await fetchImpl(buildApiUrl('/api/bins/parse-dates'), {
      ...withApiCredentials({ cache: 'no-store' }),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: trimmed })
    });
    const body = await response.json();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        code: body?.code,
        message: body?.error ?? 'AI cleanup failed.'
      };
    }
    return { ok: true, entries: /** @type {Array<{ date: string, type: string }>} */ (body.entries ?? []) };
  } catch {
    return { ok: false, status: 0, message: 'AI cleanup failed.' };
  }
}
