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
    return {
      configured: true,
      authMode: 'domain_token',
      authKey: domainToken
    };
  }
  if (apiKey) {
    return {
      configured: true,
      authMode: 'api_key',
      authKey: apiKey
    };
  }
  return { configured: false, authMode: 'none', authKey: '' };
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export function resolveGetAddressOrigin(request, env) {
  const originHeader = request.headers.get('Origin')?.trim();
  if (originHeader) {
    try {
      return new URL(originHeader).origin;
    } catch {
      /* ignore */
    }
  }

  const configuredHost = env.GETADDRESS_DOMAIN_HOST?.trim();
  if (configuredHost) {
    const host = configuredHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${host}`;
  }

  for (const entry of String(env.ALLOWED_ORIGINS ?? '').split(',')) {
    const trimmed = entry.trim();
    if (
      !trimmed.startsWith('https://') ||
      trimmed.includes('localhost') ||
      trimmed.includes('127.0.0.1') ||
      trimmed.includes('pages.dev')
    ) {
      continue;
    }
    try {
      return new URL(trimmed).origin;
    } catch {
      /* ignore */
    }
  }

  return '';
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {'domain_token' | 'api_key'} authMode
 */
export function buildGetAddressFetchHeaders(request, env, authMode) {
  const headers = { ...GETADDRESS_FETCH_HEADERS };
  if (authMode !== 'domain_token') {
    return headers;
  }

  const origin = resolveGetAddressOrigin(request, env);
  if (origin) {
    headers.Origin = origin;
    headers.Referer = `${origin}/`;
  }
  return headers;
}

/**
 * @param {Response} response
 * @param {'domain_token' | 'api_key'} [authMode]
 */
export async function readGetAddressFailure(response, authMode = 'api_key') {
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
    if (authMode === 'domain_token') {
      return {
        code: 'INVALID_DOMAIN_TOKEN',
        message:
          'Address lookup rejected the Domain Token. On getAddress.io, register the token for this hub hostname (e.g. smith.lovely-hub.com) and set GETADDRESS_DOMAIN_HOST on the Worker if needed.'
      };
    }
    return {
      code: 'INVALID_API_KEY',
      message:
        'Address lookup rejected the API key. Use the API Key from getAddress.io, or set GETADDRESS_DOMAIN_TOKEN on the Worker instead.'
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
      message: `Address lookup was blocked (${statusHint}). Check your getAddress.io Domain Token host matches this hub.`
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
 * @param {Record<string, string>} [extraHeaders]
 */
export async function fetchGetAddress(endpoint, fetchImpl = fetch, extraHeaders = {}) {
  try {
    const response = await fetchImpl(endpoint, {
      headers: { ...GETADDRESS_FETCH_HEADERS, ...extraHeaders }
    });
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
