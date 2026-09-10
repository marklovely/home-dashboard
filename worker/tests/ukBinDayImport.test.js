import { describe, expect, it, vi } from 'vitest';
import {
  fetchUkBinDaySchedule,
  isUsableUkBinDayCouncilId,
  mapUkBinDayCollections
} from '../src/bins/ukBinDayImport.js';

describe('isUsableUkBinDayCouncilId', () => {
  it('rejects google calendar fallback councils', () => {
    expect(isUsableUkBinDayCouncilId('westminster')).toBe(true);
    expect(isUsableUkBinDayCouncilId('google_public_calendar')).toBe(false);
    expect(isUsableUkBinDayCouncilId('')).toBe(false);
  });
});

describe('mapUkBinDayCollections', () => {
  it('dedupes duplicate ukbinday collection rows for the same date and type', () => {
    const mapped = mapUkBinDayCollections([
      { date: '2026-09-18', type: 'Rubbish' },
      { date: '2026-09-18', type: 'General waste' },
      { date: '2026-09-18', type: 'Recycling' },
      { date: '2026-09-18', type: 'Glass' }
    ]);
    expect(mapped.household).toEqual([
      { date: '2026-09-18', type: 'rubbish', bankHolidayChange: false },
      { date: '2026-09-18', type: 'recycling', bankHolidayChange: false }
    ]);
  });

  it('maps rubbish, recycling, and garden waste', () => {
    const mapped = mapUkBinDayCollections([
      { date: '2026-03-10', type: 'Rubbish' },
      { date: '2026-03-11', type: 'Recycling' },
      { date: '2026-03-12', type: 'Garden waste' },
      { date: 'bad', type: 'Rubbish' }
    ]);
    expect(mapped.household).toEqual([
      { date: '2026-03-10', type: 'rubbish', bankHolidayChange: false },
      { date: '2026-03-11', type: 'recycling', bankHolidayChange: false }
    ]);
    expect(mapped.gardenWaste).toEqual([{ date: '2026-03-12' }]);
  });
});

describe('fetchUkBinDaySchedule', () => {
  it('returns mapped dates from ukbinday lookup', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          cached: false,
          collections: [
            { date: '2026-04-01', type: 'general waste' },
            { date: '2026-04-08', type: 'recycling' }
          ]
        }),
        { status: 200 }
      )
    );

    const result = await fetchUkBinDaySchedule(
      {
        uprn: '100022334455',
        councilId: 'westminster',
        postcode: 'SW1A 1AA',
        address: '10 Downing Street'
      },
      fetchImpl
    );

    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
    expect(result.household).toHaveLength(2);
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.stringContaining('ukbinday.co.uk/api/v1/lookup/100022334455'),
      expect.any(Object)
    );
  });

  it('rejects unsupported council ids', async () => {
    const result = await fetchUkBinDaySchedule(
      { uprn: '1', councilId: 'google_public_calendar' },
      vi.fn()
    );
    expect(result.ok).toBe(false);
    expect(result.status).toBe(422);
  });
});
