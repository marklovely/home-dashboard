import { describe, expect, it } from 'vitest';
import {
  addMonthsIso,
  buildBinScheduleEntriesFromRepeat,
  defaultRepeatUntilDate,
  expandBinRepeatDates,
  repeatIntervalDays
} from '../src/lib/binScheduleRepeat.js';

describe('binScheduleRepeat', () => {
  it('expands weekly and fortnightly repeats until the end date', () => {
    expect(
      expandBinRepeatDates({
        startDate: '2026-01-02',
        repeatId: '1week',
        untilDate: '2026-01-23'
      })
    ).toEqual(['2026-01-02', '2026-01-09', '2026-01-16', '2026-01-23']);

    expect(
      expandBinRepeatDates({
        startDate: '2026-01-02',
        repeatId: '2weeks',
        untilDate: '2026-01-30'
      })
    ).toEqual(['2026-01-02', '2026-01-16', '2026-01-30']);
  });

  it('expands monthly repeats on the same day-of-month when possible', () => {
    expect(
      expandBinRepeatDates({
        startDate: '2026-01-15',
        repeatId: '1month',
        untilDate: '2026-04-15'
      })
    ).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
  });

  it('supports custom week intervals', () => {
    expect(repeatIntervalDays('custom', 3)).toBe(21);
    expect(
      expandBinRepeatDates({
        startDate: '2026-01-01',
        repeatId: 'custom',
        customWeeks: 3,
        untilDate: '2026-02-19'
      })
    ).toEqual(['2026-01-01', '2026-01-22', '2026-02-12']);
  });

  it('returns a single date when repeat is none', () => {
    expect(
      expandBinRepeatDates({
        startDate: '2026-05-01',
        repeatId: 'none',
        untilDate: '2026-12-31'
      })
    ).toEqual(['2026-05-01']);
  });

  it('builds typed schedule entries with bank holiday flag for household only', () => {
    expect(
      buildBinScheduleEntriesFromRepeat({
        startDate: '2026-03-06',
        type: 'rubbish',
        repeatId: '1week',
        untilDate: '2026-03-13',
        bankHolidayChange: true
      })
    ).toEqual([
      { date: '2026-03-06', type: 'rubbish', bankHolidayChange: true },
      { date: '2026-03-13', type: 'rubbish', bankHolidayChange: true }
    ]);

    expect(
      buildBinScheduleEntriesFromRepeat({
        startDate: '2026-03-06',
        type: 'gardenWaste',
        repeatId: '1week',
        untilDate: '2026-03-13',
        bankHolidayChange: true
      })
    ).toEqual([
      { date: '2026-03-06', type: 'gardenWaste', bankHolidayChange: false },
      { date: '2026-03-13', type: 'gardenWaste', bankHolidayChange: false }
    ]);
  });

  it('defaults repeat-until to one year after start', () => {
    expect(defaultRepeatUntilDate('2026-06-10')).toBe('2027-06-10');
    expect(addMonthsIso('2026-01-31', 1)).toBe('2026-03-03');
  });
});
