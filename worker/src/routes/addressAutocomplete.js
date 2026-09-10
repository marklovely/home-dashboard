import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';
import { resolveUprnFromAddress } from '../bins/osPlacesUprn.js';
import { resolveOsPlacesConfig } from '../lib/osPlaces.js';
import { resolveGooglePlacesConfig } from '../lib/googlePlaces.js';

/**
 * Google Places keys restricted to HTTP referrers must run in the browser.
 * Only authenticated hub sessions receive the key.
 *
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function handleAddressConfig(request, env) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const places = resolveGooglePlacesConfig(env);
  const osPlaces = resolveOsPlacesConfig(env);
  if (!places.configured && !osPlaces.configured) {
    return Response.json(
      { configured: false, lookupVia: 'none', uprnLookupConfigured: false },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  return Response.json(
    {
      configured: places.configured,
      lookupVia: places.configured ? 'browser' : 'none',
      placesApiKey: places.configured ? places.apiKey : undefined,
      uprnLookupConfigured: osPlaces.configured
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

/**
 * Resolve a UK property UPRN server-side (OS Places key stays on the Worker).
 *
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleAddressResolveUprn(request, env, fetchImpl = fetch) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const osPlaces = resolveOsPlacesConfig(env);
  const result = await resolveUprnFromAddress(
    {
      line1: String(body?.line1 ?? '').trim(),
      line2: String(body?.line2 ?? '').trim(),
      city: String(body?.city ?? '').trim(),
      postcode: String(body?.postcode ?? '').trim()
    },
    osPlaces.apiKey,
    fetchImpl
  );

  if (!result.ok) {
    return Response.json(
      { error: result.error, code: result.code },
      { status: result.code === 'NOT_CONFIGURED' ? 503 : 422, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  return Response.json(
    { uprn: result.uprn, formatted: result.formatted ?? null },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function handleAddressAutocomplete(request, env) {
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

  return Response.json(
    {
      configured: true,
      suggestions: [],
      error: 'USE_BROWSER_LOOKUP',
      message:
        'Address lookup runs in the browser so Google HTTP referrer restrictions apply. Fetch /api/address/config first.'
    },
    { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function handleAddressLookup(request, env) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const config = resolveGooglePlacesConfig(env);
  if (!config.configured) {
    return Response.json({ configured: false }, { status: 503 });
  }

  return Response.json(
    {
      error: 'USE_BROWSER_LOOKUP',
      message: 'Address lookup runs in the browser so Google HTTP referrer restrictions apply.'
    },
    { status: 400, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
