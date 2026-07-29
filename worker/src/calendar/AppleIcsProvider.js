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
    try {
      return await this.fetchCalendarInner(asOf);
    } catch (error) {
      if (typeof error?.code === 'string') throw error;
      console.error(
        JSON.stringify({
          event: 'calendar_unhandled',
          name: error?.name,
          detail: String(error?.message ?? '').slice(0, 160)
        })
      );
      const wrapped = new Error('CALENDAR_RUNTIME');
      wrapped.code = 'CALENDAR_RUNTIME';
      throw wrapped;
    }
  }

  /**
   * @param {Date} [asOf]
   */
  async fetchCalendarInner(asOf = new Date()) {
    const url = this.getFeedUrl();
    if (!url) {
      const error = new Error('CALENDAR_NOT_CONFIGURED');
      error.code = 'CALENDAR_NOT_CONFIGURED';
      throw error;
    }

    let response;
    try {
      response = await this.fetchImpl(url, {
        headers: {
          Accept: 'text/calendar,text/plain,*/*',
          'User-Agent': 'LovelyHomeHub-Calendar/1.0'
        },
        cf: { cacheTtl: 0 },
        redirect: 'follow'
      });
    } catch {
      console.error(JSON.stringify({ event: 'calendar_upstream_network' }));
      const error = new Error('CALENDAR_UPSTREAM');
      error.code = 'CALENDAR_UPSTREAM';
      error.upstreamStatus = 0;
      throw error;
    }

    if (!response.ok) {
      console.error(JSON.stringify({ event: 'calendar_upstream_http', status: response.status }));
      const error = new Error('CALENDAR_UPSTREAM');
      error.code = 'CALENDAR_UPSTREAM';
      error.upstreamStatus = response.status;
      throw error;
    }

    const icsText = await response.text();
    if (!icsText.includes('BEGIN:VCALENDAR')) {
      console.error(JSON.stringify({ event: 'calendar_upstream_invalid_body' }));
      const error = new Error('CALENDAR_UPSTREAM');
      error.code = 'CALENDAR_UPSTREAM';
      error.upstreamStatus = 502;
      throw error;
    }

    try {
      return parseAndExpandIcs(icsText, asOf);
    } catch {
      console.error(JSON.stringify({ event: 'calendar_parse_failed' }));
      const error = new Error('CALENDAR_PARSE');
      error.code = 'CALENDAR_PARSE';
      throw error;
    }
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export function createCalendarProvider(env, fetchImpl = fetch) {
  return new AppleIcsProvider(env, fetchImpl);
}
