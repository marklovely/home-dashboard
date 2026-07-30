import { getHomeWeather } from '../weather/weatherService.js';
import { parseWeatherAudience } from '../weather/adviceEngine.js';
import { parseWeatherCoordinateOverride } from '../weather/geocode.js';
import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleWeather(request, env, fetchImpl = fetch) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const url = new URL(request.url);
  const audience = parseWeatherAudience(url.searchParams.get('audience'));
  const coords = parseWeatherCoordinateOverride(
    url.searchParams.get('lat'),
    url.searchParams.get('lon')
  );

  if (coords && 'error' in coords) {
    return Response.json({ error: coords.error }, { status: 400 });
  }

  const result = await getHomeWeather(env, fetchImpl, audience, coords);
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };
  if (result.status === 200 && result.body.meta) {
    headers['Cache-Control'] = 'private, max-age=60';
  }
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}
