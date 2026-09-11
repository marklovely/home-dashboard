import { describe, expect, it } from 'vitest';
import {
  evaluateFreeDowngradeEligibility,
  formatFreeDowngradeBlocker,
  summarizeFreeDowngradeBlockers
} from '../functions/api/platform/freePlanDowngradeEligibility.js';

describe('freePlanDowngradeEligibility', () => {
  it('allows downgrade when guides, stays, and areas are within Free limits', () => {
    expect(
      evaluateFreeDowngradeEligibility({
        guides: 2,
        stays: 1,
        categoriesByGuide: [
          { guideId: 'default', guideTitle: 'House guide', count: 2 },
          { guideId: 'pet-care', guideTitle: 'Pet care', count: 1 }
        ]
      })
    ).toMatchObject({
      eligible: true,
      blockers: []
    });
  });

  it('blocks downgrade when any guide has too many areas', () => {
    const result = evaluateFreeDowngradeEligibility({
      guides: 1,
      stays: 0,
      categoriesByGuide: [{ guideId: 'default', guideTitle: 'House guide', count: 4 }]
    });
    expect(result.eligible).toBe(false);
    expect(result.blockers).toEqual([
      {
        kind: 'categories',
        guideId: 'default',
        guideTitle: 'House guide',
        count: 4,
        limit: 2
      }
    ]);
    expect(formatFreeDowngradeBlocker(result.blockers[0])).toContain('4 areas');
    expect(summarizeFreeDowngradeBlockers(result.blockers)).toContain('House guide');
  });

  it('blocks downgrade when guides or stays exceed Free limits', () => {
    const result = evaluateFreeDowngradeEligibility({
      guides: 3,
      stays: 4,
      categoriesByGuide: [{ guideId: 'default', count: 2 }]
    });
    expect(result.eligible).toBe(false);
    expect(result.blockers.map((blocker) => blocker.kind)).toEqual(['guides', 'stays']);
  });
});
