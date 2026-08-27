import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';
import {
  GETADDRESS_AUTOCOMPLETE_URL,
  GETADDRESS_GET_URL,
  fetchGetAddress,
  readGetAddressFailure,
  resolveGetAddressConfig
} from '../lib/getAddress.js';

/**
 * Domain tokens are validated by getAddress against the browser hostname, so they
 * must be used from the client. Only authenticated hub sessions receive the token.
 *
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function handleAddressConfig(request, env) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const config = resolveGetAddressConfig(env);
  if (!config.configured) {
    return Response.json(
      { configured: false, lookupVia: 'none' },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  if (config.lookupVia === 'browser') {
    return Response.json(
      {
        configured: true,
        lookupVia: 'browser',
        domainToken: config.domainToken
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  return Response.json(
    { configured: true, lookupVia: 'worker' },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
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

  const config = resolveGetAddressConfig(env);
  if (!config.configured) {
    return Response.json(
      { configured: false, suggestions: [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
  if (config.lookupVia === 'browser') {
    return Response.json(
      {
        configured: true,
        suggestions: [],
        error: 'USE_BROWSER_LOOKUP',
        message: 'Address lookup runs in the browser when a Domain Token is configured.'
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
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

  const endpoint = `${GETADDRESS_AUTOCOMPLETE_URL}/${encodeURIComponent(term)}?api-key=${encodeURIComponent(config.apiKey)}&all=true`;
  const upstream = await fetchGetAddress(endpoint, fetchImpl);
  if (!upstream.ok) {
    return Response.json(
      {
        configured: true,
        suggestions: [],
        error: upstream.failure.code,
        message: upstream.failure.message
      },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const response = upstream.response;
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
    ? payload.suggestions
        .map((entry) => ({
          id: String(entry?.id ?? ''),
          label: String(entry?.address ?? '')
        }))
        .filter((entry) => entry.id && entry.label)
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

  const config = resolveGetAddressConfig(env);
  if (!config.configured) {
    return Response.json({ configured: false }, { status: 503 });
  }
  if (config.lookupVia === 'browser') {
    return Response.json(
      {
        error: 'USE_BROWSER_LOOKUP',
        message: 'Address lookup runs in the browser when a Domain Token is configured.'
      },
      { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const id = new URL(request.url).searchParams.get('id')?.trim() ?? '';
  if (!id) {
    return Response.json({ error: 'MISSING_ID' }, { status: 400 });
  }

  const endpoint = `${GETADDRESS_GET_URL}/${encodeURIComponent(id)}?api-key=${encodeURIComponent(config.apiKey)}`;
  const upstream = await fetchGetAddress(endpoint, fetchImpl);
  if (!upstream.ok) {
    return Response.json(
      { error: upstream.failure.code, message: upstream.failure.message },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const response = upstream.response;
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
