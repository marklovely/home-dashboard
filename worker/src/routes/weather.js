import { getHomeWeather } from '../weather/weatherService.js';
import { parseWeatherAudience } from '../weather/adviceEngine.js';
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

  const audience = parseWeatherAudience(new URL(request.url).searchParams.get('audience'));
  const result = await getHomeWeather(env, fetchImpl, audience);
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' };
  if (result.status === 200 && result.body.meta) {
    headers['Cache-Control'] = 'private, max-age=60';
  }
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}
