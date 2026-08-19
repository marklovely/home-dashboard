import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  dismissBinAlertForCollection,
  getDismissedBinCollectionDate,
  isBinAlertDismissed,
  resetBinAlertDismissalForTests
} from '../src/services/binAlertDismissalService.js';
import {
  getBinCollectionAlert,
  getBinCollectionHomeSummary
} from '../src/services/binCollectionService.js';

describe('binAlertDismissalService', () => {
  afterEach(() => {
    resetBinAlertDismissalForTests();
    vi.useRealTimers();
  });

  it('stores dismissal for the current collection date', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T12:00:00'));
    dismissBinAlertForCollection('2026-07-31');
    expect(getDismissedBinCollectionDate()).toBe('2026-07-31');
    expect(isBinAlertDismissed('2026-07-31')).toBe(true);
    expect(isBinAlertDismissed('2026-08-07')).toBe(false);
  });

  it('clears dismissal after collection day has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T09:00:00'));
    dismissBinAlertForCollection('2026-07-31');
    expect(getDismissedBinCollectionDate()).toBeNull();
    expect(isBinAlertDismissed('2026-07-31')).toBe(false);
  });

  it('suppresses bin alerts and home card highlight until collection day ends', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T12:00:00'));
    dismissBinAlertForCollection('2026-07-31');
    const asOf = new Date('2026-07-30T12:00:00');

    expect(getBinCollectionAlert(asOf, { houseSitter: true })).toBeNull();
    expect(getBinCollectionHomeSummary(asOf, { houseSitter: true }).alert).toBeNull();
  });
});
