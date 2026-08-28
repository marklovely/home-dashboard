import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';
import { browserPlacesAutocomplete, browserPlacesLookup } from '../lib/googlePlacesBrowser.js';

/** @typedef {{ configured: boolean, lookupVia: 'none' | 'browser', placesApiKey?: string }} AddressLookupConfig */

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
  if (!response.ok || data?.configured !== true) {
    cachedConfig = { configured: false, lookupVia: 'none' };
    return cachedConfig;
  }

  cachedConfig = {
    configured: true,
    lookupVia: data.lookupVia === 'browser' ? 'browser' : 'none',
    placesApiKey: typeof data.placesApiKey === 'string' ? data.placesApiKey : undefined
  };
  return cachedConfig;
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
