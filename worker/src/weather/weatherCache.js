export const WEATHER_CACHE_TTL_MS = 15 * 60 * 1000;

/** @type {Map<string, { payload: import('./weatherTypes.js').DashboardWeatherPayload, expiresAt: number }>} */
const memoryCache = new Map();

/**
 * @param {import('./weatherTypes.js').DashboardWeatherPayload} payload
 * @param {number} [ttlMs]
 * @param {string} [cacheKey]
 */
export function setWeatherCache(payload, ttlMs = WEATHER_CACHE_TTL_MS, cacheKey = 'default') {
  memoryCache.set(cacheKey, {
    payload,
    expiresAt: Date.now() + ttlMs
  });
}

/**
 * @param {string} [cacheKey]
 * @returns {import('./weatherTypes.js').DashboardWeatherPayload | null}
 */
export function getFreshWeatherCache(cacheKey = 'default') {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) return null;
  return entry.payload;
}

/**
 * @param {string} [cacheKey]
 * @returns {import('./weatherTypes.js').DashboardWeatherPayload | null}
 */
export function getStaleWeatherCache(cacheKey = 'default') {
  return memoryCache.get(cacheKey)?.payload ?? null;
}

/** @internal */
export function resetWeatherCacheForTests() {
  memoryCache.clear();
}
