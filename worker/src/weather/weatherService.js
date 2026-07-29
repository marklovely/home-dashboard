import { createOpenMeteoProvider, fetchDashboardWeatherFromOpenMeteo } from './OpenMeteoProvider.js';
import {
  getFreshWeatherCache,
  getStaleWeatherCache,
  setWeatherCache,
  WEATHER_CACHE_TTL_MS
} from './weatherCache.js';

/**
 * @param {Record<string, string | undefined>} env
 */
function readHomeCoordinates(env) {
  const latitude = Number(env.HOME_LATITUDE);
  const longitude = Number(env.HOME_LONGITUDE);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }
  return { latitude, longitude };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function getHomeWeather(env, fetchImpl = fetch) {
  const coords = readHomeCoordinates(env);
  if (!coords) {
    return {
      status: 503,
      body: {
        ok: false,
        error: 'Weather location is not configured on the Worker.'
      }
    };
  }

  const cachedFresh = getFreshWeatherCache();
  if (cachedFresh) {
    return {
      status: 200,
      body: {
        ...cachedFresh,
        meta: { ...cachedFresh.meta, fromCache: true, stale: false }
      }
    };
  }

  const provider = createOpenMeteoProvider(coords);
  const fetchedAt = new Date().toISOString();

  try {
    const payload = await fetchDashboardWeatherFromOpenMeteo(provider, fetchImpl, {
      fetchedAt,
      fromCache: false,
      stale: false
    });
    setWeatherCache(payload, WEATHER_CACHE_TTL_MS);
    return { status: 200, body: payload };
  } catch {
    const stale = getStaleWeatherCache();
    if (stale) {
      return {
        status: 200,
        body: {
          ...stale,
          meta: {
            ...stale.meta,
            fromCache: true,
            stale: true
          }
        }
      };
    }
    return {
      status: 503,
      body: {
        ok: false,
        error: 'Weather currently unavailable.'
      }
    };
  }
}

export { WEATHER_CACHE_TTL_MS, resetWeatherCacheForTests } from './weatherCache.js';
