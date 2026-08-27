import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/** @type {Record<string, string>} */
const ADDRESS_LOOKUP_MESSAGES = {
  INVALID_API_KEY:
    'Address lookup rejected the API key. Set GETADDRESS_API_KEY on the hub Worker (not Pages).',
  INVALID_DOMAIN_TOKEN:
    'Address lookup rejected the Domain Token. Register it on getAddress.io for this hub hostname.',
  RATE_LIMITED: 'Address lookup is temporarily rate-limited. Try again shortly.',
  LOOKUP_FAILED: 'Address lookup failed.',
  FETCH_FAILED: 'Could not reach getAddress.io from the hub Worker.'
};

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
 * @param {string} term
 * @param {string} [countryCode]
 * @param {typeof fetch} [fetchImpl]
 */
export async function fetchAddressSuggestions(term, countryCode = 'GB', fetchImpl = fetch) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, configured: false, suggestions: [], message: 'API not configured' };
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
