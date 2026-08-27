import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';
import {
  googlePlacesAutocomplete,
  googlePlacesLookup,
  resolveGooglePlacesConfig
} from '../lib/googlePlaces.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function handleAddressConfig(request, env) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const config = resolveGooglePlacesConfig(env);
  if (!config.configured) {
    return Response.json(
      { configured: false, lookupVia: 'none' },
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

  const config = resolveGooglePlacesConfig(env);
  if (!config.configured) {
    return Response.json(
      { configured: false, suggestions: [] },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  const url = new URL(request.url);
  const term = url.searchParams.get('term')?.trim() ?? '';
  const country = url.searchParams.get('country')?.trim().toUpperCase() ?? 'GB';
  const sessionToken = url.searchParams.get('sessionToken')?.trim() ?? '';

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

  const upstream = await googlePlacesAutocomplete(
    term,
    country,
    config.apiKey,
    sessionToken,
    fetchImpl
  );
  if (!upstream.ok) {
    return Response.json(
      {
        configured: true,
        suggestions: [],
        error: upstream.failure?.code ?? 'LOOKUP_FAILED',
        message: upstream.failure?.message ?? 'Address lookup failed.'
      },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  return Response.json(
    { configured: true, suggestions: upstream.suggestions ?? [] },
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

  const config = resolveGooglePlacesConfig(env);
  if (!config.configured) {
    return Response.json({ configured: false }, { status: 503 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim() ?? '';
  const country = url.searchParams.get('country')?.trim().toUpperCase() ?? 'GB';
  const sessionToken = url.searchParams.get('sessionToken')?.trim() ?? '';
  if (!id) {
    return Response.json({ error: 'MISSING_ID' }, { status: 400 });
  }

  const upstream = await googlePlacesLookup(id, config.apiKey, country, sessionToken, fetchImpl);
  if (!upstream.ok) {
    return Response.json(
      {
        error: upstream.failure?.code ?? 'LOOKUP_FAILED',
        message: upstream.failure?.message ?? 'Address lookup failed.'
      },
      { status: 502, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  return Response.json(
    {
      configured: true,
      address: upstream.address
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
