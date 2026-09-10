import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';
import { resolveUprnFromPropertyAddress } from '../lib/getAddressBrowser.js';
import { browserPlacesAutocomplete, browserPlacesLookup } from '../lib/googlePlacesBrowser.js';

/** @typedef {{
 *   configured: boolean,
 *   lookupVia: 'none' | 'browser',
 *   placesApiKey?: string,
 *   uprnLookupConfigured?: boolean,
 *   getAddressApiKey?: string
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
    uprnLookupConfigured: data?.uprnLookupConfigured === true,
    getAddressApiKey: typeof data.getAddressApiKey === 'string' ? data.getAddressApiKey : undefined
  };
  return cachedConfig;
}

/**
 * @param {import('../lib/propertyAddress.js').PropertyAddress | Record<string, unknown>} address
 * @param {typeof fetch} [fetchImpl]
 */
export async function resolvePropertyUprn(address, fetchImpl = fetch) {
  const config = await fetchAddressLookupConfig(fetchImpl);
  if (!config.uprnLookupConfigured || !config.getAddressApiKey) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      message:
        'Automatic import needs a property ID (UPRN). Google address lookup does not include this — ask your hub admin to enable UPRN lookup, or use PDF upload / paste instead.'
    };
  }
  return resolveUprnFromPropertyAddress(address, config.getAddressApiKey, fetchImpl);
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
