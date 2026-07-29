import { describe, expect, it } from 'vitest';
import { normalizeAppleCalendarFeedUrl } from '../src/calendar/feedUrl.js';

describe('normalizeAppleCalendarFeedUrl', () => {
  it('converts webcal to https', () => {
    expect(normalizeAppleCalendarFeedUrl('webcal://p01-calendarws.icloud.com/published/2/test')).toBe(
      'https://p01-calendarws.icloud.com/published/2/test'
    );
  });

  it('strips wrapping quotes', () => {
    expect(normalizeAppleCalendarFeedUrl('"https://p01-calendarws.icloud.com/published/2/test"')).toBe(
      'https://p01-calendarws.icloud.com/published/2/test'
    );
  });

  it('rejects non-https', () => {
    expect(normalizeAppleCalendarFeedUrl('ftp://example.com/x.ics')).toBeNull();
  });
});
