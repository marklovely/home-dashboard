import { getHomeWeather } from '../weather/weatherService.js';

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleWeather(env, fetchImpl = fetch) {
  const result = await getHomeWeather(env, fetchImpl);
  const headers = { 'Content-Type': 'application/json' };
  if (result.status === 200 && result.body.meta) {
    headers['Cache-Control'] = 'public, max-age=60';
  }
  return new Response(JSON.stringify(result.body), { status: result.status, headers });
}
