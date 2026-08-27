/** @deprecated getAddress.io ceased API operations in Feb 2026; default is Ideal Postcodes compatibility API. */
export const DEFAULT_ADDRESS_LOOKUP_ORIGIN = 'https://ga.ideal-postcodes.co.uk';

export const GETADDRESS_FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'LovelyHomeHub/1.0 (Cloudflare Worker; +https://lovely-home.co.uk)'
};

/**
 * @param {string | undefined} raw
 */
export function normalizeGetAddressSecret(raw) {
  return String(raw ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function resolveAddressLookupOrigin(env) {
  const configured = normalizeGetAddressSecret(env.ADDRESS_LOOKUP_API_ORIGIN);
  if (!configured) return DEFAULT_ADDRESS_LOOKUP_ORIGIN;
  return configured.replace(/\/+$/, '');
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function resolveAddressLookupUrls(env) {
  const origin = resolveAddressLookupOrigin(env);
  return {
    autocomplete: `${origin}/autocomplete`,
    get: `${origin}/get`
  };
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function resolveGetAddressConfig(env) {
  const apiKey = normalizeGetAddressSecret(env.GETADDRESS_API_KEY);
  if (apiKey) {
    return {
      configured: true,
      apiKey,
      ...resolveAddressLookupUrls(env)
    };
  }
  return {
    configured: false,
    apiKey: '',
    ...resolveAddressLookupUrls(env)
  };
}

/**
 * @param {Response} response
 * @param {string} [apiOrigin]
 */
export async function readGetAddressFailure(response, apiOrigin = DEFAULT_ADDRESS_LOOKUP_ORIGIN) {
  let upstreamMessage = '';
  const contentType = response.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('json')) {
      const body = await response.json();
      upstreamMessage = String(body?.Message ?? body?.message ?? '').trim();
    } else {
      upstreamMessage = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 200);
    }
  } catch {
    /* ignore */
  }

  const statusHint = upstreamMessage || `address lookup API returned HTTP ${response.status}`;

  if (response.status === 401) {
    const legacyGetAddress = apiOrigin.includes('getAddress.io');
    return {
      code: 'INVALID_API_KEY',
      message: legacyGetAddress
        ? 'getAddress.io no longer accepts API requests (service closed Feb 2026). Set GETADDRESS_API_KEY on the hub Worker to an Ideal Postcodes API key — see docs.ideal-postcodes.co.uk/migrate/getaddressio.'
        : 'Address lookup rejected the API key. Set GETADDRESS_API_KEY on the hub Worker to a valid Ideal Postcodes API key.'
    };
  }
  if (response.status === 429) {
    return {
      code: 'RATE_LIMITED',
      message: 'Address lookup is temporarily rate-limited. Try again shortly.'
    };
  }

  return {
    code: 'LOOKUP_FAILED',
    message: `Address lookup failed (${statusHint}).`
  };
}

/**
 * @param {string} endpoint
 * @param {typeof fetch} fetchImpl
 */
export async function fetchGetAddress(endpoint, fetchImpl = fetch) {
  try {
    const response = await fetchImpl(endpoint, { headers: GETADDRESS_FETCH_HEADERS });
    return { ok: true, response, failure: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 200) : 'unknown';
    console.error(JSON.stringify({ event: 'address_lookup_fetch_failed', detail }));
    return {
      ok: false,
      response: null,
      failure: {
        code: 'FETCH_FAILED',
        message: 'Could not reach the address lookup service from the hub Worker. Try again shortly.'
      }
    };
  }
}
