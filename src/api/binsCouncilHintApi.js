import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @typedef {{
 *   postcode: string,
 *   adminDistrict: string | null,
 *   region: string | null,
 *   councilName: string | null,
 *   councilHomepageUrl: string | null,
 *   binsUrl: string | null,
 *   councilSlug: string | null,
 *   ukBinDaySupported: boolean,
 *   suggestedPattern: string | null
 * }} BinsCouncilHint
 */

/**
 * @param {string} postcode
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<{ ok: true, hint: BinsCouncilHint } | { ok: false, status: number, message: string }>}
 */
export async function fetchBinsCouncilHint(postcode, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 0, message: 'API not configured' };
  }

  const trimmed = postcode.trim();
  if (!trimmed) {
    return { ok: false, status: 400, message: 'Postcode is required.' };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/bins/council-hint?postcode=${encodeURIComponent(trimmed)}`),
      withApiCredentials({ cache: 'no-store' })
    );
    const body = await response.json();
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: body?.error ?? 'Council lookup failed.'
      };
    }
    return { ok: true, hint: /** @type {BinsCouncilHint} */ (body) };
  } catch {
    return { ok: false, status: 0, message: 'Council lookup failed.' };
  }
}
