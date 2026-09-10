import { describe, expect, it, vi, afterEach } from 'vitest';
import { getArrivalPrepHomeSummary } from '../../src/lib/arrivalPrep/arrivalPrepSummary.js';
import * as siteProfileService from '../../src/services/siteProfileService.js';

describe('getArrivalPrepHomeSummary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns dash when owner-only use case', () => {
    vi.spyOn(siteProfileService, 'getSiteProfileState').mockReturnValue({
      profile: { useCase: 'owner' }
    });
    expect(getArrivalPrepHomeSummary()).toEqual({ title: '—', subtitle: '' });
  });

  it('returns remaining count for sitter use case', () => {
    vi.spyOn(siteProfileService, 'getSiteProfileState').mockReturnValue({
      profile: {
        useCase: 'housesitter',
        arrivalPrep: { checkedTaskIds: ['home.vacuum'], gardenEnabled: false }
      }
    });
    const summary = getArrivalPrepHomeSummary();
    expect(summary.title).toMatch(/remaining$/);
    expect(summary.subtitle).toMatch(/done$/);
  });
});
