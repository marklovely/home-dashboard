import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

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
      message:
        data?.message ||
        data?.error ||
        (response.status === 404 ? 'Address lookup is not available on this hub yet.' : 'Address lookup failed.')
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
      message: data?.error || 'Could not load that address.'
    };
  }
  return {
    ok: true,
    address: data?.address ?? null
  };
}
