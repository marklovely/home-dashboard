export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

/** @type {{ payload: import('./weatherTypes.js').DashboardWeatherPayload, expiresAt: number } | null} */
let memoryCache = null;

/**
 * @param {import('./weatherTypes.js').DashboardWeatherPayload} payload
 * @param {number} [ttlMs]
 */
export function setWeatherCache(payload, ttlMs = WEATHER_CACHE_TTL_MS) {
  memoryCache = {
    payload,
    expiresAt: Date.now() + ttlMs
  };
}

/**
 * @returns {import('./weatherTypes.js').DashboardWeatherPayload | null}
 */
export function getFreshWeatherCache() {
  if (!memoryCache) return null;
  if (Date.now() > memoryCache.expiresAt) return null;
  return memoryCache.payload;
}

/**
 * @returns {import('./weatherTypes.js').DashboardWeatherPayload | null}
 */
export function getStaleWeatherCache() {
  return memoryCache?.payload ?? null;
}

/** @internal */
export function resetWeatherCacheForTests() {
  memoryCache = null;
}
