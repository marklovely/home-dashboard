import { describe, expect, it } from 'vitest';
import { getBinCollectionSummary, getUpcomingBinCollection } from '../src/services/binCollectionService.js';

describe('binCollectionService', () => {
  it('returns a friendly summary', () => {
    const summary = getBinCollectionSummary(new Date('2026-07-29T12:00:00'));
    expect(summary.title).toMatch(/♻|⚫/);
    expect(summary.subtitle).toBeTruthy();
  });

  it('picks the soonest collection stream', () => {
    const next = getUpcomingBinCollection(new Date('2026-07-29T12:00:00'));
    expect(next.label).toMatch(/Recycling|General Waste/);
    expect(next.relative).toBeTruthy();
  });
});
