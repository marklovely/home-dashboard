import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';
import { browserAutocomplete, browserGetAddress } from '../lib/getAddressBrowser.js';

/** @type {Record<string, string>} */
const ADDRESS_LOOKUP_MESSAGES = {
  INVALID_API_KEY:
    'Address lookup rejected the API key. Set GETADDRESS_API_KEY on the hub Worker (not Pages).',
  RATE_LIMITED: 'Address lookup is temporarily rate-limited. Try again shortly.',
  LOOKUP_FAILED: 'Address lookup failed. Check the getAddress.io account and hub Worker secret.',
  FETCH_FAILED:
    'Could not reach getAddress.io from the hub Worker. Set GETADDRESS_DOMAIN_TOKEN on the Worker instead.'
};

/** @typedef {{ configured: boolean, lookupVia: 'none' | 'worker' | 'browser', domainToken?: string }} AddressLookupConfig */

/** @type {AddressLookupConfig | null} */
let cachedConfig = null;

/**
 * @param {unknown} data
 * @param {number} status
 */
function addressLookupErrorMessage(data, status) {
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  const code = typeof data?.error === 'string' ? data.error : '';
  if (code && ADDRESS_LOOKUP_MESSAGES[code]) {
    return ADDRESS_LOOKUP_MESSAGES[code];
  }
  if (status === 404) {
    return 'Address lookup is not available on this hub yet.';
  }
  return ADDRESS_LOOKUP_MESSAGES.LOOKUP_FAILED;
}

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
    lookupVia: data.lookupVia === 'browser' ? 'browser' : 'worker',
    domainToken: typeof data.domainToken === 'string' ? data.domainToken : undefined
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
 */
export async function fetchAddressSuggestions(term, countryCode = 'GB', fetchImpl = fetch) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, configured: false, suggestions: [], message: 'API not configured' };
  }

  const config = await fetchAddressLookupConfig(fetchImpl);
  if (!config.configured) {
    return { ok: false, configured: false, suggestions: [], message: 'API not configured' };
  }

  if (config.lookupVia === 'browser' && config.domainToken) {
    const direct = await browserAutocomplete(term, config.domainToken, fetchImpl);
    if (!direct.ok) {
      return { ok: false, configured: true, suggestions: [], message: direct.message };
    }
    return { ok: true, configured: true, suggestions: direct.suggestions };
  }

  const params = new URLSearchParams({
    term,
    country: countryCode
  });
  const response = await fetchImpl(
    buildApiUrl(`/api/address/autocomplete?${params.toString()}`),
    withApiCredentials({ cache: 'no-store' })
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const configured =
      typeof data?.configured === 'boolean'
        ? data.configured
        : response.status === 503
          ? false
          : null;
    return {
      ok: false,
      configured,
      suggestions: [],
      message: addressLookupErrorMessage(data, response.status)
    };
  }
  return {
    ok: true,
    configured: data?.configured !== false,
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : []
  };
}

/**
 * @param {string} id
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchAddressById(id, fetchImpl = fetch) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, message: 'API not configured' };
  }

  const config = await fetchAddressLookupConfig(fetchImpl);
  if (config.lookupVia === 'browser' && config.domainToken) {
    return browserGetAddress(config.domainToken, id, fetchImpl);
  }

  const params = new URLSearchParams({ id });
  const response = await fetchImpl(
    buildApiUrl(`/api/address/lookup?${params.toString()}`),
    withApiCredentials({ cache: 'no-store' })
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      ok: false,
      message: addressLookupErrorMessage(data, response.status)
    };
  }
  return {
    ok: true,
    address: data?.address ?? null
  };
}
