import { createOpenMeteoProvider, fetchDashboardWeatherFromOpenMeteo } from './OpenMeteoProvider.js';
import {
  getFreshWeatherCache,
  getStaleWeatherCache,
  setWeatherCache,
  WEATHER_CACHE_TTL_MS
} from './weatherCache.js';
import { applyWeatherAudience } from './adviceEngine.js';
import { weatherCacheKey } from './geocode.js';

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
 * @param {import('./weatherTypes.js').DashboardWeatherPayload} body
 * @param {import('./adviceEngine.js').WeatherAdviceAudience} audience
 */
function withAudience(body, audience) {
  return applyWeatherAudience(body, audience);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 * @param {import('./adviceEngine.js').WeatherAdviceAudience} [audience]
 * @param {{ latitude: number, longitude: number } | null} [coordsOverride]
 */
export async function getHomeWeather(env, fetchImpl = fetch, audience = 'owner', coordsOverride = null) {
  const coords = coordsOverride ?? readHomeCoordinates(env);
  if (!coords) {
    return {
      status: 503,
      body: {
        ok: false,
        error: 'Weather location is not configured on the Worker.'
      }
    };
  }

  const cacheKey = weatherCacheKey(coords.latitude, coords.longitude);
  const cachedFresh = getFreshWeatherCache(cacheKey);
  if (cachedFresh) {
    return {
      status: 200,
      body: withAudience(
        {
          ...cachedFresh,
          meta: { ...cachedFresh.meta, fromCache: true, stale: false }
        },
        audience
      )
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
    setWeatherCache(payload, WEATHER_CACHE_TTL_MS, cacheKey);
    return { status: 200, body: withAudience(payload, audience) };
  } catch {
    const stale = getStaleWeatherCache(cacheKey);
    if (stale) {
      return {
        status: 200,
        body: withAudience(
          {
            ...stale,
            meta: {
              ...stale.meta,
              fromCache: true,
              stale: true
            }
          },
          audience
        )
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
