import { afterEach, describe, expect, it } from 'vitest';
import { formatDate, formatTime, getGreeting } from '../src/js/utils/format.js';
import { resetDisplayPreferencesForTests, setClockFormat } from '../src/services/displayPreferencesService.js';

describe('format utilities', () => {
  afterEach(() => {
    resetDisplayPreferencesForTests();
  });

  it('returns the expected greeting', () => {
    expect(getGreeting(8)).toBe('Good morning');
    expect(getGreeting(14)).toBe('Good afternoon');
    expect(getGreeting(21)).toBe('Good evening');
  });

  it('formats time using 24-hour clock by default', () => {
    expect(formatTime(new Date('2026-07-28T16:09:00'))).toBe('16:09');
  });

  it('formats time using 12-hour clock when selected', () => {
    setClockFormat('12');
    expect(formatTime(new Date('2026-07-28T16:09:00'))).toMatch(/04:09\sPM/i);
  });

  it('formats a UK date', () => {
    expect(formatDate(new Date('2026-07-28T12:00:00'))).toContain('Tuesday');
  });
});
