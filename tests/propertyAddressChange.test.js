import { describe, expect, it } from 'vitest';
import {
  binScheduleAfterPropertyAddressChange,
  hasLocationSensitiveBinData,
  hasPropertyAddressChanged,
  planPropertyAddressChange,
  propertyAddressForSaveAfterChange,
  shouldConfirmPropertyAddressChange
} from '../src/lib/propertyAddressChange.js';

describe('propertyAddressChange', () => {
  it('detects line 1 and postcode changes', () => {
    expect(
      hasPropertyAddressChanged(
        { line1: '110 Tiddington Road', postcode: 'CV37 7BB' },
        { line1: '111 Tiddington Road', postcode: 'CV37 7BB' }
      )
    ).toBe(true);
    expect(
      hasPropertyAddressChanged(
        { line1: '110 Tiddington Road', postcode: 'CV37 7BB' },
        { line1: '110 Tiddington Road', postcode: 'CV37 6NT' }
      )
    ).toBe(true);
    expect(
      hasPropertyAddressChanged(
        { line1: '110 Tiddington Road', postcode: 'CV37 7BB' },
        { line1: '110 Tiddington Road', postcode: 'CV37 7BB' }
      )
    ).toBe(false);
  });

  it('clears bin dates and council metadata after an address change', () => {
    const cleared = binScheduleAfterPropertyAddressChange({
      collectionLocation: 'End of drive',
      councilUrl: 'https://example.gov.uk/bins',
      validFrom: '2026-01-01',
      validUntil: '2026-12-31',
      normalCollectionDay: 'Friday',
      alertHoursBefore: 48,
      household: [{ date: '2026-09-18', type: 'rubbish' }],
      gardenWaste: [{ date: '2026-10-01' }]
    });

    expect(cleared.household).toEqual([]);
    expect(cleared.gardenWaste).toEqual([]);
    expect(cleared.councilUrl).toBe('');
    expect(cleared.validFrom).toBe('');
    expect(cleared.collectionLocation).toBe('End of drive');
    expect(cleared.alertHoursBefore).toBe(48);
  });

  it('keeps a fresh UPRN when autocomplete resolved a new property', () => {
    expect(
      propertyAddressForSaveAfterChange(
        { line1: '110 Tiddington Road', postcode: 'CV37 7BB', uprn: '1001' },
        { line1: '12 Other Road', postcode: 'CV37 6NT', uprn: '1002' }
      ).uprn
    ).toBe('1002');
    expect(
      propertyAddressForSaveAfterChange(
        { line1: '110 Tiddington Road', postcode: 'CV37 7BB', uprn: '1001' },
        { line1: '12 Other Road', postcode: 'CV37 6NT', uprn: '1001' }
      ).uprn
    ).toBe('');
  });

  it('skips confirm on first address entry but confirms when replacing an address with bins', () => {
    expect(
      shouldConfirmPropertyAddressChange({}, { line1: 'New', postcode: 'AA1 1AA' }, {})
    ).toBe(false);
    expect(
      shouldConfirmPropertyAddressChange(
        { line1: 'Old', postcode: 'AA1 1AA' },
        { line1: 'New', postcode: 'BB2 2BB' },
        { binSchedule: { household: [{ date: '2026-09-18', type: 'rubbish' }] } }
      )
    ).toBe(true);
  });

  it('does not confirm a plain address change when no bin data exists yet', () => {
    expect(
      shouldConfirmPropertyAddressChange(
        { line1: 'Old', postcode: 'AA1 1AA' },
        { line1: 'New', postcode: 'BB2 2BB' },
        {}
      )
    ).toBe(false);
  });

  it('plans bin schedule clearing when profile has collection dates', () => {
    const plan = planPropertyAddressChange({
      previousAddress: { line1: 'Old', postcode: 'AA1 1AA' },
      nextAddress: { line1: 'New', postcode: 'BB2 2BB' },
      profile: {
        binSchedule: {
          household: [{ date: '2026-09-18', type: 'rubbish' }],
          gardenWaste: []
        }
      }
    });

    expect(plan.addressChanged).toBe(true);
    expect(plan.clearsBinSchedule).toBe(true);
    expect(plan.binSchedule?.household).toEqual([]);
    expect(hasLocationSensitiveBinData({ councilUrl: 'https://x.example' })).toBe(true);
  });
});
