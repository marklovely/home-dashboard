import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';

const GETADDRESS_AUTOCOMPLETE_URL = 'https://api.getAddress.io/autocomplete';
const GETADDRESS_GET_URL = 'https://api.getAddress.io/get';
const GETADDRESS_FETCH_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'LovelyHomeHub/1.0 (Cloudflare Worker; +https://lovely-home.co.uk)'
};

/**
 * @param {string | undefined} raw
 */
function normalizeGetAddressApiKey(raw) {
  return String(raw ?? '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/**
 * @param {Response} response
 */
async function readGetAddressFailure(response) {
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
        'Address lookup rejected the API key. Copy the API Key from getAddress.io (not the Administration Key or a Domain Token) and set it on the hub Worker with wrangler secret put GETADDRESS_API_KEY --env <site>.'
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
      message: `Address lookup was blocked (${statusHint}). Confirm your getAddress.io subscription is active.`
    };
  }

  return {
    code: 'LOOKUP_FAILED',
    message: `Address lookup failed (${statusHint}). Check your getAddress.io account and GETADDRESS_API_KEY on the hub Worker.`
  };
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleAddressAutocomplete(request, env, fetchImpl = fetch) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const apiKey = normalizeGetAddressApiKey(env.GETADDRESS_API_KEY);
  if (!apiKey) {
    return Response.json(
      { configured: false, suggestions: [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const url = new URL(request.url);
  const term = url.searchParams.get('term')?.trim() ?? '';
  const country = url.searchParams.get('country')?.trim().toUpperCase() ?? 'GB';
  if (country !== 'GB') {
    return Response.json(
      { configured: true, suggestions: [], unsupportedCountry: true },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  if (term.length < 3) {
    return Response.json(
      { configured: true, suggestions: [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const endpoint = `${GETADDRESS_AUTOCOMPLETE_URL}/${encodeURIComponent(term)}?api-key=${encodeURIComponent(apiKey)}&all=true`;
  const response = await fetchImpl(endpoint, { headers: GETADDRESS_FETCH_HEADERS });
  if (!response.ok) {
    const failure = await readGetAddressFailure(response);
    return Response.json(
      {
        configured: true,
        suggestions: [],
        error: failure.code,
        message: failure.message,
        upstreamStatus: response.status
      },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const payload = await response.json();
  const suggestions = Array.isArray(payload?.suggestions)
    ? payload.suggestions.map((entry) => ({
        id: String(entry?.id ?? ''),
        label: String(entry?.address ?? '')
      })).filter((entry) => entry.id && entry.label)
    : [];

  return Response.json(
    { configured: true, suggestions },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleAddressLookup(request, env, fetchImpl = fetch) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const apiKey = normalizeGetAddressApiKey(env.GETADDRESS_API_KEY);
  if (!apiKey) {
    return Response.json({ configured: false }, { status: 503 });
  }

  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!id) {
    return Response.json({ error: 'MISSING_ID' }, { status: 400 });
  }

  const endpoint = `${GETADDRESS_GET_URL}/${encodeURIComponent(id)}?api-key=${encodeURIComponent(apiKey)}`;
  const response = await fetchImpl(endpoint, { headers: GETADDRESS_FETCH_HEADERS });
  if (!response.ok) {
    const failure = await readGetAddressFailure(response);
    return Response.json(
      { error: failure.code, message: failure.message, upstreamStatus: response.status },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const payload = await response.json();
  return Response.json(
    {
      configured: true,
      address: {
        line1: String(payload?.line_1 ?? payload?.line1 ?? '').trim(),
        line2: String(payload?.line_2 ?? payload?.line2 ?? '').trim(),
        line3: String(payload?.line_3 ?? payload?.line3 ?? '').trim(),
        city: String(payload?.town_or_city ?? payload?.town_or_city ?? payload?.city ?? '').trim(),
        county: String(payload?.county ?? payload?.district ?? '').trim(),
        country: 'United Kingdom',
        postcode: String(payload?.postcode ?? '').trim()
      }
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
