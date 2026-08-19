import { describe, expect, it } from 'vitest';
import {
  getBinAlertHoursBefore,
  hasConfiguredBinSchedule,
  inferBinSchedulePeriod,
  normalizeBinSchedule,
  validateBinSchedule
} from '../src/lib/binScheduleProfile.js';

describe('binScheduleProfile', () => {
  it('normalises household and garden entries', () => {
    const schedule = normalizeBinSchedule({
      collectionLocation: 'End of close',
      household: [
        { date: '2026-08-07', type: 'rubbish' },
        { date: 'bad', type: 'rubbish' },
        { date: '2026-08-14', type: 'recycling', bankHolidayChange: true }
      ],
      gardenWaste: [{ date: '2026-08-05' }, { date: 'not-a-date' }]
    });

    expect(schedule.household).toEqual([
      { date: '2026-08-07', type: 'rubbish', bankHolidayChange: false },
      { date: '2026-08-14', type: 'recycling', bankHolidayChange: true }
    ]);
    expect(schedule.gardenWaste).toEqual([{ date: '2026-08-05' }]);
    expect(hasConfiguredBinSchedule(schedule)).toBe(true);
  });

  it('infers valid period from dates when blank', () => {
    const schedule = inferBinSchedulePeriod(
      normalizeBinSchedule({
        household: [{ date: '2026-03-06', type: 'rubbish' }],
        gardenWaste: [{ date: '2026-10-31' }]
      })
    );
    expect(schedule.validFrom).toBe('2026-03-06');
    expect(schedule.validUntil).toBe('2026-10-31');
  });

  it('allows empty schedule during setup', () => {
    const schedule = normalizeBinSchedule({});
    expect(validateBinSchedule(schedule)).toEqual({ ok: true });
    expect(hasConfiguredBinSchedule(schedule)).toBe(false);
  });

  it('defaults alert hours to 24 and clamps custom values', () => {
    expect(normalizeBinSchedule({}).alertHoursBefore).toBe(24);
    expect(normalizeBinSchedule({ alertHoursBefore: 48 }).alertHoursBefore).toBe(48);
    expect(normalizeBinSchedule({ alertHoursBefore: 0 }).alertHoursBefore).toBe(0);
    expect(normalizeBinSchedule({ alertHoursBefore: 999 }).alertHoursBefore).toBe(168);
    expect(getBinAlertHoursBefore({ alertHoursBefore: 12 })).toBe(12);
  });
});
