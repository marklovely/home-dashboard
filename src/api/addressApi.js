import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';
import { browserPlacesAutocomplete, browserPlacesLookup } from '../lib/googlePlacesBrowser.js';

/** @typedef {{
 *   configured: boolean,
 *   lookupVia: 'none' | 'browser',
 *   placesApiKey?: string,
 *   uprnLookupConfigured?: boolean
 * }} AddressLookupConfig */

/** @type {AddressLookupConfig | null} */
let cachedConfig = null;

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchAddressLookupConfig(fetchImpl = fetch) {
  if (cachedConfig) return cachedConfig;

  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    cachedConfig = { configured: false, lookupVia: 'none' };
    return cachedConfig;
  }

  const response = await fetchImpl(
    buildApiUrl('/api/address/config'),
    withApiCredentials({ cache: 'no-store' })
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    cachedConfig = { configured: false, lookupVia: 'none', uprnLookupConfigured: false };
    return cachedConfig;
  }

  cachedConfig = {
    configured: data?.configured === true,
    lookupVia: data.lookupVia === 'browser' ? 'browser' : 'none',
    placesApiKey: typeof data.placesApiKey === 'string' ? data.placesApiKey : undefined,
    uprnLookupConfigured: data?.uprnLookupConfigured === true
  };
  return cachedConfig;
}

/**
 * @param {import('../lib/propertyAddress.js').PropertyAddress | Record<string, unknown>} address
 * @param {typeof fetch} [fetchImpl]
 */
export async function resolvePropertyUprn(address, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, code: 'NOT_CONFIGURED', message: 'API not configured' };
  }

  const normalized = {
    line1: String(address?.line1 ?? '').trim(),
    line2: String(address?.line2 ?? '').trim(),
    city: String(address?.city ?? '').trim(),
    postcode: String(address?.postcode ?? '').trim()
  };

  try {
    const response = await fetchImpl(buildApiUrl('/api/address/resolve-uprn'), {
      ...withApiCredentials({ cache: 'no-store' }),
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(normalized)
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      return {
        ok: false,
        code: body?.code ?? 'LOOKUP_FAILED',
        message:
          body?.error ??
          'Could not look up your property ID for automatic import — use PDF upload or paste instead.'
      };
    }
    const uprn = String(body?.uprn ?? '').trim();
    if (!uprn) {
      return {
        ok: false,
        code: 'NO_UPRN',
        message: 'No property ID was returned — use PDF upload or paste instead.'
      };
    }
    return { ok: true, uprn };
  } catch {
    return {
      ok: false,
      code: 'LOOKUP_FAILED',
      message: 'Could not look up your property ID right now — try again or use PDF/paste.'
    };
  }
}

/** Reset cached lookup mode (tests). */
export function resetAddressLookupConfigCache() {
  cachedConfig = null;
}

/**
 * @param {string} term
 * @param {string} [countryCode]
 * @param {typeof fetch} [fetchImpl]
 * @param {string} [sessionToken]
 */
export async function fetchAddressSuggestions(
  term,
  countryCode = 'GB',
  fetchImpl = fetch,
  sessionToken = ''
) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, configured: false, suggestions: [], message: 'API not configured' };
  }

  const config = await fetchAddressLookupConfig(fetchImpl);
  if (!config.configured || !config.placesApiKey) {
    return { ok: false, configured: false, suggestions: [], message: 'API not configured' };
  }

  const direct = await browserPlacesAutocomplete(
    term,
    countryCode,
    config.placesApiKey,
    sessionToken,
    fetchImpl
  );
  if (!direct.ok) {
    return { ok: false, configured: true, suggestions: [], message: direct.message };
  }
  return { ok: true, configured: true, suggestions: direct.suggestions };
}

/**
 * @param {string} id
 * @param {typeof fetch} [fetchImpl]
 * @param {string} [countryCode]
 * @param {string} [sessionToken]
 */
export async function fetchAddressById(id, fetchImpl = fetch, countryCode = 'GB', sessionToken = '') {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, message: 'API not configured' };
  }

  const config = await fetchAddressLookupConfig(fetchImpl);
  if (!config.placesApiKey) {
    return { ok: false, message: 'API not configured' };
  }

  return browserPlacesLookup(id, countryCode, config.placesApiKey, sessionToken, fetchImpl);
}
