export const GETADDRESS_AUTOCOMPLETE_URL = 'https://api.getAddress.io/autocomplete';
export const GETADDRESS_GET_URL = 'https://api.getAddress.io/get';
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
    .trim();
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function resolveGetAddressConfig(env) {
  const domainToken = normalizeGetAddressSecret(env.GETADDRESS_DOMAIN_TOKEN);
  const apiKey = normalizeGetAddressSecret(env.GETADDRESS_API_KEY);
  if (domainToken) {
    return { configured: true, lookupVia: 'browser', domainToken, apiKey: '' };
  }
  if (apiKey) {
    return { configured: true, lookupVia: 'worker', domainToken: '', apiKey };
  }
  return { configured: false, lookupVia: 'none', domainToken: '', apiKey: '' };
}

/**
 * @param {Response} response
 */
export async function readGetAddressFailure(response) {
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

  const statusHint = upstreamMessage || `getAddress.io returned HTTP ${response.status}`;

  if (response.status === 401) {
    return {
      code: 'INVALID_API_KEY',
      message:
        'Address lookup rejected the API key. Use the API Key from getAddress.io, or create a Domain Token for this hub hostname and set GETADDRESS_DOMAIN_TOKEN on the Worker.'
    };
  }
  if (response.status === 429) {
    return {
      code: 'RATE_LIMITED',
      message: 'Address lookup is temporarily rate-limited. Try again shortly.'
    };
  }
  if (response.status === 403) {
    return {
      code: 'LOOKUP_FAILED',
      message: `Address lookup was blocked (${statusHint}). Server-side calls from Cloudflare Workers are often blocked — create a Domain Token on getAddress.io for your hub hostname and set GETADDRESS_DOMAIN_TOKEN on the Worker.`
    };
  }

  return {
    code: 'LOOKUP_FAILED',
    message: `Address lookup failed (${statusHint}). If getAddress.io shows no usage, set GETADDRESS_DOMAIN_TOKEN (Domain Token) on the Worker instead of the API key.`
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
        message:
          'Could not reach getAddress.io from the hub Worker. Create a Domain Token on getAddress.io for this hub hostname and set GETADDRESS_DOMAIN_TOKEN on the Worker (wrangler secret put --env <site>).'
      }
    };
  }
}
