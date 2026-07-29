import { parseAndExpandIcs } from './recurrence.js';

/**
 * @implements {import('./CalendarProvider.js').CalendarProvider}
 */
export class AppleIcsProvider {
  /**
   * @param {Record<string, string | undefined>} env
   * @param {typeof fetch} fetchImpl
   */
  constructor(env, fetchImpl = fetch) {
    this.env = env;
    this.fetchImpl = fetchImpl;
  }

  getFeedUrl() {
    const raw = this.env.APPLE_CALENDAR_ICS_URL?.trim();
    if (!raw) return null;
    if (raw.startsWith('webcal://')) {
      return `https://${raw.slice('webcal://'.length)}`;
    }
    return raw;
  }

  /**
   * @param {Date} [asOf]
   */
  async fetchCalendar(asOf = new Date()) {
    const url = this.getFeedUrl();
    if (!url) {
      const error = new Error('CALENDAR_NOT_CONFIGURED');
      error.code = 'CALENDAR_NOT_CONFIGURED';
      throw error;
    }

    const response = await this.fetchImpl(url, {
      headers: { Accept: 'text/calendar' },
      cf: { cacheTtl: 0 }
    });

    if (!response.ok) {
      const error = new Error('CALENDAR_UPSTREAM');
      error.code = 'CALENDAR_UPSTREAM';
      throw error;
    }

    const icsText = await response.text();
    return parseAndExpandIcs(icsText, asOf);
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export function createCalendarProvider(env, fetchImpl = fetch) {
  return new AppleIcsProvider(env, fetchImpl);
}
