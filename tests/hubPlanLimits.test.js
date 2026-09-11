import { describe, expect, it } from 'vitest';
import {
  planCategoryLimitExceeded,
  planFeatureEnabled,
  planLimitExceeded,
  siteIdFromHubRequest
} from '../worker/src/lib/hubPlanLimits.js';

describe('hubPlanLimits', () => {
  it('extracts site id from hub Origin', () => {
    expect(siteIdFromHubRequest('https://smith.lovely-hub.com')).toBe('smith');
    expect(siteIdFromHubRequest('https://test.lovely-home.co.uk')).toBe('test');
  });

  it('extracts site id from Pages proxy host header when Worker Host is hub.internal', () => {
    const request = new Request('https://hub.internal/api/hub/plan-usage', {
      headers: {
        Host: 'hub.internal',
        'X-Hub-Pages-Host': 'test-cottage-free.lovely-hub.com'
      }
    });
    expect(siteIdFromHubRequest(request)).toBe('test-cottage-free');
  });

  it('disables bins and smart home on Free plan feature flags', () => {
    const freePlan = {
      plan: 'free',
      features: { bins: false, smartHome: false, weather: true }
    };
    expect(planFeatureEnabled(freePlan, 'weather')).toBe(true);
    expect(planFeatureEnabled(freePlan, 'bins')).toBe(false);
    expect(planFeatureEnabled({ plan: 'plus', features: { bins: true, smartHome: true, weather: true } }, 'bins')).toBe(
      true
    );
  });

  it('detects when a free-plan limit is reached', () => {
    const freePlan = { limits: { maxGuides: 2, maxStays: 2 } };
    expect(planLimitExceeded(freePlan, 2, 'guide')).toBe(true);
    expect(planLimitExceeded(freePlan, 1, 'stay')).toBe(false);
    expect(planLimitExceeded({ limits: { maxGuides: null, maxStays: null } }, 99, 'stay')).toBe(false);
  });

  it('detects when the free-plan area limit is reached', () => {
    const freePlan = { limits: { maxCategories: 2 } };
    expect(planCategoryLimitExceeded(freePlan, 2)).toBe(true);
    expect(planCategoryLimitExceeded(freePlan, 1)).toBe(false);
    expect(planCategoryLimitExceeded({ limits: { maxCategories: null } }, 99)).toBe(false);
  });
});
