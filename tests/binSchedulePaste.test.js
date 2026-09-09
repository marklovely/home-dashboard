import { describe, expect, it } from 'vitest';
import {
  binScheduleEntriesFromParsed,
  parseBinScheduleLine,
  parseBinSchedulePaste
} from '../src/lib/binSchedulePaste.js';

describe('binSchedulePaste', () => {
  it('parses ISO and UK dates with type keywords', () => {
    expect(parseBinScheduleLine('2026-09-12 general')).toEqual({
      date: '2026-09-12',
      type: 'rubbish',
      raw: '2026-09-12 general'
    });
    expect(parseBinScheduleLine('19/09/2026 recycling')).toEqual({
      date: '2026-09-19',
      type: 'recycling',
      raw: '19/09/2026 recycling'
    });
  });

  it('summarises a multi-line paste', () => {
    const result = parseBinSchedulePaste(
      '2026-09-12 rubbish\n2026-09-19 recycling\n# comment\nbad line'
    );
    expect(result.validCount).toBe(2);
    expect(result.unknownCount).toBe(1);
  });

  it('maps parsed rows into household and garden arrays', () => {
    const parsed = parseBinSchedulePaste('2026-09-12 general\n2026-09-16 garden');
    const { household, gardenWaste } = binScheduleEntriesFromParsed(parsed.entries);
    expect(household).toEqual([{ date: '2026-09-12', type: 'rubbish', bankHolidayChange: false }]);
    expect(gardenWaste).toEqual([{ date: '2026-09-16' }]);
  });
});
