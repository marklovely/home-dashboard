import {
  getFreshCalendarCache,
  getStaleCalendarCache,
  setCalendarCache
} from './calendarCache.js';
import { createCalendarProvider } from './AppleIcsProvider.js';

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 * @param {Date} [asOf]
 */
export async function getHomeCalendar(env, fetchImpl = fetch, asOf = new Date()) {
  const fresh = getFreshCalendarCache();
  if (fresh) {
    return { ...fresh, stale: false };
  }

  const provider = createCalendarProvider(env, fetchImpl);

  try {
    const payload = await provider.fetchCalendar(asOf);
    setCalendarCache(payload);
    return payload;
  } catch (error) {
    if (error?.code === 'CALENDAR_NOT_CONFIGURED') {
      throw error;
    }
    const stale = getStaleCalendarCache();
    if (stale) {
      return { ...stale, stale: true };
    }
    throw error;
  }
}

export { resetCalendarCacheForTests } from './calendarCache.js';
