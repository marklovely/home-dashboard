import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';
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

  const config = resolveGooglePlacesConfig(env);
  if (!config.configured) {
    return Response.json(
      { configured: false, lookupVia: 'none' },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  return Response.json(
    {
      configured: true,
      lookupVia: 'browser',
      placesApiKey: config.apiKey
    },
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
