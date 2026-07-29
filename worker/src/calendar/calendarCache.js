export const CALENDAR_CACHE_TTL_MS = 5 * 60 * 1000;

/** @type {{ payload: import('./calendarTypes.js').CalendarApiResponse, expiresAt: number } | null} */
let memoryCache = null;

/**
 * @param {import('./calendarTypes.js').CalendarApiResponse} payload
 * @param {number} [ttlMs]
 */
export function setCalendarCache(payload, ttlMs = CALENDAR_CACHE_TTL_MS) {
  memoryCache = {
    payload,
    expiresAt: Date.now() + ttlMs
  };
}

/**
 * @returns {import('./calendarTypes.js').CalendarApiResponse | null}
 */
export function getFreshCalendarCache() {
  if (!memoryCache) return null;
  if (Date.now() > memoryCache.expiresAt) return null;
  return memoryCache.payload;
}

/**
 * @returns {import('./calendarTypes.js').CalendarApiResponse | null}
 */
export function getStaleCalendarCache() {
  return memoryCache?.payload ?? null;
}

/** @internal */
export function resetCalendarCacheForTests() {
  memoryCache = null;
}

/** @internal */
export function expireCalendarCacheForTests() {
  if (memoryCache) memoryCache.expiresAt = 0;
}
