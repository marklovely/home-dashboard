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
    .replace(/^["']+|["']+$/g, '')
    .trim();
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function resolveGetAddressConfig(env) {
  const domainToken = normalizeGetAddressSecret(env.GETADDRESS_DOMAIN_TOKEN);
  const apiKey = normalizeGetAddressSecret(env.GETADDRESS_API_KEY);
  if (domainToken) {
    return {
      configured: true,
      lookupVia: 'browser',
      domainToken,
      apiKey: ''
    };
  }
  if (apiKey) {
    return {
      configured: true,
      lookupVia: 'worker',
      domainToken: '',
      apiKey
    };
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
        'Address lookup rejected the API key. Set GETADDRESS_API_KEY on the hub Worker, or use a Domain Token instead.'
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
        message: 'Could not reach getAddress.io from the hub Worker. Try again shortly.'
      }
    };
  }
}
