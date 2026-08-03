import { parseAndExpandIcs } from './recurrence.js';
import {
  classifyFetchNetworkError,
  safeFetchErrorDetail
} from './feedUrl.js';
import {
  getConfiguredCalendarFeedRaw,
  getConfiguredCalendarFeedUrl
} from '../lib/calendarFeed.js';

const ICS_FETCH_HEADERS = {
  Accept: 'text/calendar,text/plain,*/*',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
};

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
    return null;
  }

  async resolveFeedUrl() {
    return getConfiguredCalendarFeedUrl(this.env);
  }

  /**
   * @param {string} url
   */
  async fetchIcsText(url) {
    let lastError;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await this.fetchImpl(url, {
          method: 'GET',
          headers: ICS_FETCH_HEADERS,
          redirect: 'follow'
        });
        return response;
      } catch (error) {
        lastError = error;
        if (attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
    }
    const detail = safeFetchErrorDetail(lastError);
    const networkReason = classifyFetchNetworkError(lastError);
    console.error(JSON.stringify({ event: 'calendar_upstream_network', networkReason, detail }));
    const fetchError = new Error('CALENDAR_UPSTREAM');
    fetchError.code = 'CALENDAR_UPSTREAM';
    fetchError.upstreamStatus = 0;
    fetchError.networkReason = networkReason;
    throw fetchError;
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
    const rawConfigured = Boolean((await getConfiguredCalendarFeedRaw(this.env)).trim());
    const url = await this.resolveFeedUrl();
    if (!url) {
      const error = new Error(rawConfigured ? 'CALENDAR_INVALID_URL' : 'CALENDAR_NOT_CONFIGURED');
      error.code = rawConfigured ? 'CALENDAR_INVALID_URL' : 'CALENDAR_NOT_CONFIGURED';
      throw error;
    }

    const response = await this.fetchIcsText(url);

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
    } catch (parseError) {
      const detail = parseError instanceof Error ? parseError.message.slice(0, 160) : 'parse_failed';
      console.error(JSON.stringify({ event: 'calendar_parse_failed', detail }));
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
