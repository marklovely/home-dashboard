import { describe, expect, it } from 'vitest';
import {
  currentUsageMonth,
  emptyThirdPartyApiUsage,
  incrementOsPlacesUsage,
  parseThirdPartyApiUsage
} from '../src/lib/thirdPartyApiUsage.js';

describe('thirdPartyApiUsage', () => {
  it('parses stored usage and rolls month counters forward', () => {
    const usage = parseThirdPartyApiUsage(
      JSON.stringify({
        osPlaces: { lifetime: 4, month: '2026-08', monthCalls: 2 }
      })
    );
    const next = incrementOsPlacesUsage(usage, 2, new Date('2026-09-10T12:00:00Z'));
    expect(next.osPlaces.lifetime).toBe(6);
    expect(next.osPlaces.month).toBe('2026-09');
    expect(next.osPlaces.monthCalls).toBe(2);
  });

  it('returns empty usage when unset', () => {
    expect(parseThirdPartyApiUsage(null)).toEqual(emptyThirdPartyApiUsage());
    expect(currentUsageMonth(new Date('2026-09-01T00:00:00Z'))).toBe('2026-09');
  });
});
