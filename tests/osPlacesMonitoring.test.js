import { describe, expect, it } from 'vitest';
import {
  applyOsPlacesUsageBaseline,
  describeOsPlacesTrial,
  resolveOsPlacesUsageBaseline
} from '../functions/api/platform/osPlacesMonitoring.js';

describe('osPlacesMonitoring', () => {
  it('reads usage baseline from platform env with built-in default', () => {
    expect(resolveOsPlacesUsageBaseline({})).toBe(20);
    expect(resolveOsPlacesUsageBaseline({ OS_PLACES_USAGE_BASELINE: '20' })).toBe(20);
    expect(resolveOsPlacesUsageBaseline({ OS_PLACES_USAGE_BASELINE: '0' })).toBe(0);
    expect(resolveOsPlacesUsageBaseline({ OS_PLACES_USAGE_BASELINE: '-1' })).toBe(20);
  });

  it('shows trial details by default', () => {
    const trial = describeOsPlacesTrial({}, new Date('2026-09-12T12:00:00Z'));
    expect(trial).toMatchObject({
      trialDays: 60,
      endsAt: '2026-11-09',
      daysRemaining: 58
    });
  });

  it('applies baseline to hub totals once at platform level', () => {
    expect(
      applyOsPlacesUsageBaseline(
        { OS_PLACES_USAGE_BASELINE: '20' },
        { lifetimeTotal: 3, monthTotal: 1 }
      )
    ).toMatchObject({
      baseline: 20,
      lifetimeTotal: 23,
      monthTotal: 21,
      trackedLifetimeTotal: 3,
      trackedMonthTotal: 1
    });
  });

  it('describes trial days remaining from trial end date', () => {
    const trial = describeOsPlacesTrial(
      {
        OS_PLACES_TRIAL_END: '2026-11-09',
        OS_PLACES_TRIAL_DAYS: '60'
      },
      new Date('2026-09-12T12:00:00Z')
    );
    expect(trial).toMatchObject({
      trialDays: 60,
      endsAt: '2026-11-09',
      daysRemaining: 58,
      expired: false
    });
  });
});
