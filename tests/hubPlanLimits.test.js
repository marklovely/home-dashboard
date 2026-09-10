import { describe, expect, it } from 'vitest';
import { planLimitExceeded, siteIdFromHubRequest } from '../worker/src/lib/hubPlanLimits.js';

describe('hubPlanLimits', () => {
  it('extracts site id from hub Origin', () => {
    expect(siteIdFromHubRequest('https://smith.lovely-hub.com')).toBe('smith');
    expect(siteIdFromHubRequest('https://test.lovely-home.co.uk')).toBe('test');
  });

  it('detects when a free-plan limit is reached', () => {
    const freePlan = { limits: { maxGuides: 2, maxStays: 2 } };
    expect(planLimitExceeded(freePlan, 2, 'guide')).toBe(true);
    expect(planLimitExceeded(freePlan, 1, 'stay')).toBe(false);
    expect(planLimitExceeded({ limits: { maxGuides: null, maxStays: null } }, 99, 'stay')).toBe(false);
  });
});
