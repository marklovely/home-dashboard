import { describe, expect, it } from 'vitest';
import { normalizeIcsText } from '../src/calendar/icsNormalize.js';
import { parseIcsRoot } from '../src/calendar/appleIcsExpand.js';

describe('normalizeIcsText', () => {
  it('merges orphan lines into the previous property (Apple location quirk)', () => {
    const broken = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test@test
DTSTART:20260729T140000Z
DTEND:20260729T150000Z
LOCATION:Queen Alexandra Hospital
Portsmouth
SUMMARY:Appointment
END:VEVENT
END:VCALENDAR`;

    const normalized = normalizeIcsText(broken);
    expect(normalized).toContain('LOCATION:Queen Alexandra Hospital Portsmouth');
    const { events } = parseIcsRoot(
      broken,
      new Date('2026-07-29T00:00:00Z'),
      new Date('2026-08-05T23:59:59Z')
    );
    expect(events[0].location).toContain('Portsmouth');
  });
});
