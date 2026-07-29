import { getHomeWeather } from '../weather/weatherService.js';
import { parseWeatherAudience } from '../weather/adviceEngine.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleWeather(request, env, fetchImpl = fetch) {
  const audience = parseWeatherAudience(new URL(request.url).searchParams.get('audience'));
  const result = await getHomeWeather(env, fetchImpl, audience);
  const headers = { 'Content-Type': 'application/json' };
  if (result.status === 200 && result.body.meta) {
    headers['Cache-Control'] = 'public, max-age=60';
  }
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}
