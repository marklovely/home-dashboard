import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';
import { geocodeWeatherQuery } from '../weather/geocode.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleWeatherGeocode(request, env, fetchImpl = fetch) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const query = new URL(request.url).searchParams.get('q')?.trim() ?? '';
  const result = await geocodeWeatherQuery(query, env, fetchImpl);
  return Response.json(result.body, {
    status: result.status,
    headers: { 'Cache-Control': 'private, no-store' }
  });
}
