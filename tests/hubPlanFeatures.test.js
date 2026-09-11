import { describe, expect, it, beforeEach, vi } from 'vitest';

vi.mock('../src/auth/userMode.js', () => ({
  isOwnerUserMode: () => true
}));

import {
  isHubPlanFeatureEnabled,
  planFeatureLockedCopy,
  setHubPlanFeaturesForTests
} from '../src/services/hubPlanFeatures.js';

describe('hubPlanFeatures', () => {
  beforeEach(() => {
    setHubPlanFeaturesForTests(null);
  });

  it('fail-opens when plan features are not loaded', () => {
    expect(isHubPlanFeatureEnabled('bins')).toBe(true);
  });

  it('blocks bins and smart home on Free', () => {
    setHubPlanFeaturesForTests({
      plan: 'free',
      planLabel: 'Free',
      features: { bins: false, smartHome: false, weather: true },
      upgradeUrl: 'https://lovely-home.co.uk/account?upgrade=test'
    });
    expect(isHubPlanFeatureEnabled('weather')).toBe(true);
    expect(isHubPlanFeatureEnabled('bins')).toBe(false);
    expect(isHubPlanFeatureEnabled('smartHome')).toBe(false);
  });

  it('describes locked bins for owners with an upgrade link', () => {
    setHubPlanFeaturesForTests({
      plan: 'free',
      planLabel: 'Free',
      features: { bins: false, smartHome: false, weather: true },
      upgradeUrl: 'https://lovely-home.co.uk/account?upgrade=test'
    });
    const copy = planFeatureLockedCopy('bins');
    expect(copy.showUpgrade).toBe(true);
    expect(copy.upgradeUrl).toContain('upgrade=test');
  });
});
