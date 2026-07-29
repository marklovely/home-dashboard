import { describe, expect, it } from 'vitest';
import { getIcalExpanderConstructor } from '../src/calendar/icalExpanderLoader.js';
import { parseAndExpandIcs } from '../src/calendar/recurrence.js';

describe('icalExpander loader', () => {
  it('returns a constructor function', () => {
    const Ctor = getIcalExpanderConstructor();
    expect(typeof Ctor).toBe('function');
  });

  it('parses minimal ICS through loader', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:loader-test@test
DTSTART:20260729T140000Z
DTEND:20260729T143000Z
SUMMARY:Loader test
END:VEVENT
END:VCALENDAR`;
    const payload = parseAndExpandIcs(ics, new Date('2026-07-29T12:00:00Z'));
    expect(payload.events.some((event) => event.title === 'Loader test')).toBe(true);
  });
});
