import { afterEach, describe, expect, it } from 'vitest';
import {
  getBinAppearance,
  getBinDescriptionForType,
  normalizeBinColors
} from '../src/lib/binAppearanceProfile.js';
import { normalizeBinSchedule } from '../src/lib/binScheduleProfile.js';
import { resetSiteProfileStateForTests, setSiteProfileStateForTests } from '../src/services/siteProfileService.js';

describe('binAppearanceProfile', () => {
  afterEach(() => {
    resetSiteProfileStateForTests();
  });

  it('defaults bin colours to green, black, and brown', () => {
    expect(normalizeBinColors(undefined)).toEqual({
      rubbish: 'green',
      recycling: 'black',
      gardenWaste: 'brown'
    });
  });

  it('builds coloured bin descriptions', () => {
    expect(getBinDescriptionForType('recycling', { rubbish: 'green', recycling: 'blue', gardenWaste: 'brown' })).toBe(
      'Blue wheelie bin + glass box'
    );
  });

  it('reads colours from site profile', () => {
    setSiteProfileStateForTests({
      profile: {
        binSchedule: normalizeBinSchedule({
          binColors: { rubbish: 'red', recycling: 'yellow', gardenWaste: 'purple' }
        })
      }
    });

    expect(getBinAppearance('rubbish').colorLabel).toBe('Red');
    expect(getBinAppearance('rubbish').description).toBe('Red wheelie bin');
  });
});
