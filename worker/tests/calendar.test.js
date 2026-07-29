import { describe, expect, it, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseAndExpandIcs } from '../src/calendar/recurrence.js';
import {
  getHomeCalendar,
  resetCalendarCacheForTests
} from '../src/calendar/calendarService.js';
import { expireCalendarCacheForTests } from '../src/calendar/calendarCache.js';
import { issueOwnerToken, verifyOwnerBearer } from '../src/lib/ownerToken.js';
import { handleCalendar } from '../src/routes/calendar.js';
import { createAccessTestEnv, signTestAccessJwt, withAccessJwt } from './accessTestHelpers.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sampleIcs = readFileSync(join(__dirname, 'fixtures/sample-calendar.ics'), 'utf8');

describe('calendar ICS parsing', () => {
  it('maps timed events with location', () => {
    const asOf = new Date('2026-07-29T10:00:00+01:00');
    const payload = parseAndExpandIcs(sampleIcs, asOf);
    const dentist = payload.events.find((event) => event.title === 'Dentist');
    expect(dentist).toBeTruthy();
    expect(dentist?.allDay).toBe(false);
    expect(dentist?.location).toBe('Waterlooville');
    expect(dentist?.start).toContain('14:00');
  });

  it('includes all-day events', () => {
    const asOf = new Date('2026-07-29T10:00:00+01:00');
    const payload = parseAndExpandIcs(sampleIcs, asOf);
    expect(payload.events.some((event) => event.title === 'Annual leave' && event.allDay)).toBe(true);
  });

  it('expands weekly recurrence within range', () => {
    const asOf = new Date('2026-07-29T09:00:00+01:00');
    const payload = parseAndExpandIcs(sampleIcs, asOf);
    expect(payload.events.some((event) => event.title === 'Hospital appointment')).toBe(true);
  });

  it('excludes cancelled events', () => {
    const asOf = new Date('2026-07-29T10:00:00+01:00');
    const payload = parseAndExpandIcs(sampleIcs, asOf);
    expect(payload.events.some((event) => event.title === 'Cancelled visit')).toBe(false);
  });

  it('omits notes attendees and organiser fields', () => {
    const asOf = new Date('2026-07-29T10:00:00+01:00');
    const payload = parseAndExpandIcs(sampleIcs, asOf);
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/ATTENDEE|ORGANIZER|DESCRIPTION|alarms/i);
  });
});

describe('calendar cache and provider', () => {
  beforeEach(() => {
    resetCalendarCacheForTests();
  });

  it('serves cached data on cache hit', async () => {
    const fetchImpl = vi.fn(async () => new Response(sampleIcs, { status: 200 }));
    const env = { APPLE_CALENDAR_ICS_URL: 'https://calendar.example/private.ics' };
    const asOf = new Date('2026-07-29T10:00:00+01:00');
    const first = await getHomeCalendar(env, fetchImpl, asOf);
    const second = await getHomeCalendar(env, fetchImpl, asOf);
    expect(first.events.length).toBeGreaterThan(0);
    expect(second.generatedAt).toBe(first.generatedAt);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('returns stale data when provider fails after cache', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response(sampleIcs, { status: 200 }))
      .mockResolvedValueOnce(new Response('fail', { status: 503 }));
    const env = { APPLE_CALENDAR_ICS_URL: 'https://calendar.example/private.ics' };
    const asOf = new Date('2026-07-29T10:00:00+01:00');
    await getHomeCalendar(env, fetchImpl, asOf);
    expireCalendarCacheForTests();
    const stale = await getHomeCalendar(env, fetchImpl, asOf);
    expect(stale.stale).toBe(true);
    expect(stale.events.length).toBeGreaterThan(0);
  });
});

describe('owner calendar authorization', () => {
  const accessEnv = createAccessTestEnv({ OWNER_SESSION_SECRET: 'test-signing-secret-value' });

  beforeEach(() => {
    resetCalendarCacheForTests();
  });

  it('issues and verifies owner bearer token', async () => {
    const env = { OWNER_SESSION_SECRET: 'test-signing-secret-value' };
    const session = await issueOwnerToken(env);
    expect(session?.token).toBeTruthy();
    const ok = await verifyOwnerBearer(`Bearer ${session?.token}`, env);
    expect(ok).toBe(true);
  });

  it('returns 401 without Access JWT', async () => {
    const response = await handleCalendar(new Request('https://worker.test/api/calendar'), accessEnv, fetch);
    expect(response.status).toBe(401);
  });

  it('returns calendar JSON for authorized owner Access identity', async () => {
    const env = {
      ...accessEnv,
      APPLE_CALENDAR_ICS_URL: 'https://calendar.example/private.ics'
    };
    const token = await signTestAccessJwt('owner@example.com', env);
    const fetchImpl = vi.fn(async () => new Response(sampleIcs, { status: 200 }));
    const response = await handleCalendar(
      new Request('https://worker.test/api/calendar', withAccessJwt(token)),
      env,
      fetchImpl
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.events).toBeTruthy();
    expect(JSON.stringify(body)).not.toContain('calendar.example');
    expect(JSON.stringify(body)).not.toContain('webcal://');
  });

  it('returns 503 when APPLE_CALENDAR_ICS_URL is missing', async () => {
    const token = await signTestAccessJwt('owner@example.com', accessEnv);
    const response = await handleCalendar(
      new Request('https://worker.test/api/calendar', withAccessJwt(token)),
      accessEnv,
      fetch
    );
    expect(response.status).toBe(503);
  });
});
