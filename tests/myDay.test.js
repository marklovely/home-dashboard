import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  buildHomeCardSummary,
  formatEventTimeRange,
  groupEventsByLocalDate,
  isEventHappeningNow,
  sortEventsForDay
} from '../src/services/myDayFormat.js';
import {
  canFetchMyDayCalendar,
  clearMyDayCalendarState,
  getMyDayHomeSummary,
  refreshMyDayCalendar
} from '../src/services/myDayCalendarService.js';
import { setOwnerAccessToken, clearOwnerAccessToken, resetOwnerAccessTokenForTests } from '../src/auth/ownerAccessToken.js';
import { setUserMode, UserMode, resetUserModeForTests } from '../src/auth/userMode.js';
import { getAppsForProfile } from '../src/services/appRegistry.js';
import '../src/apps/index.js';

const samplePayload = {
  generatedAt: '2026-07-29T10:00:00.000Z',
  timezone: 'Europe/London',
  range: { from: '2026-07-29', to: '2026-08-04' },
  stale: false,
  lastUpdated: '2026-07-29T10:00:00.000Z',
  events: [
    {
      id: 'a',
      title: 'Dentist',
      start: '2026-07-29T14:00:00+01:00',
      end: '2026-07-29T14:30:00+01:00',
      allDay: false,
      location: null,
      status: 'confirmed'
    },
    {
      id: 'b',
      title: 'Annual leave',
      start: '2026-07-29T00:00:00+00:00',
      end: '2026-07-29T23:59:59+00:00',
      allDay: true,
      location: null,
      status: 'confirmed'
    }
  ]
};

describe('My Day visibility', () => {
  it('registers My Day for owner profile only', () => {
    const ownerApps = getAppsForProfile('owner').map((app) => app.id);
    const sitterApps = getAppsForProfile('housesitter').map((app) => app.id);
    expect(ownerApps).toContain('my-day');
    expect(sitterApps).not.toContain('my-day');
  });
});

describe('My Day calendar service', () => {
  beforeEach(() => {
    resetUserModeForTests();
    resetOwnerAccessTokenForTests();
    clearMyDayCalendarState();
    setUserMode(UserMode.Owner);
  });

  it('does not fetch in house sitter mode', async () => {
    setUserMode(UserMode.HouseSitter);
    const fetchImpl = vi.fn();
    await refreshMyDayCalendar(fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(canFetchMyDayCalendar()).toBe(false);
  });

  it('does not fetch without owner token', async () => {
    const fetchImpl = vi.fn();
    await refreshMyDayCalendar(fetchImpl);
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(getMyDayHomeSummary().subtitle).toMatch(/Owner PIN required/i);
  });

  it('fetches when owner token is present', async () => {
    setOwnerAccessToken('token', new Date(Date.now() + 600000).toISOString());
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => samplePayload
    }));
    await refreshMyDayCalendar(fetchImpl);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('clears state when switching to house sitter', async () => {
    setOwnerAccessToken('token', new Date(Date.now() + 600000).toISOString());
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => samplePayload
    }));
    await refreshMyDayCalendar(fetchImpl);
    clearMyDayCalendarState();
    setUserMode(UserMode.HouseSitter);
    clearOwnerAccessToken();
    expect(canFetchMyDayCalendar()).toBe(false);
  });
});

describe('My Day formatting', () => {
  it('builds next-event home card summary', () => {
    const asOf = new Date('2026-07-29T13:00:00+01:00');
    const summary = buildHomeCardSummary(samplePayload, asOf);
    expect(summary.title).toBe('My Day');
    expect(summary.subtitle).toMatch(/Dentist/);
  });

  it('orders all-day events before timed events', () => {
    const sorted = sortEventsForDay(samplePayload.events);
    expect(sorted[0].allDay).toBe(true);
  });

  it('detects happening-now events', () => {
    const event = samplePayload.events[0];
    const asOf = new Date('2026-07-29T14:05:00+01:00');
    expect(isEventHappeningNow(event, asOf)).toBe(true);
  });

  it('formats all-day label', () => {
    expect(formatEventTimeRange(samplePayload.events[1])).toBe('All day');
  });

  it('groups events by local date', () => {
    const grouped = groupEventsByLocalDate(samplePayload.events, new Date('2026-07-29T12:00:00+01:00'));
    expect([...grouped.keys()]).toContain('2026-07-29');
  });
});
