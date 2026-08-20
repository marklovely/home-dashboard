import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetRouterForTests, navigate, getCurrentRoute } from '../src/shell/router.js';
import { resetUserModeForTests, setUserMode, UserMode } from '../src/auth/userMode.js';
import {
  markSiteProfileReadyForTests,
  markSiteSetupAvailableForTests,
  resetSiteProfileStateForTests,
  setSiteProfileStateForTests
} from '../src/services/siteProfileService.js';
import {
  requestHubSetupWizardRerun,
  resetHubSetupWizardStateForTests
} from '../src/apps/HubSetup/hubSetupWizardState.js';
import { applyHubSetupRoutePolicy } from '../src/apps/HubSetup/hubSetupRoutePolicy.js';

describe('hubSetupRoutePolicy', () => {
  afterEach(() => {
    resetHubSetupWizardStateForTests();
    resetSiteProfileStateForTests();
    resetRouterForTests();
    resetUserModeForTests();
    vi.unstubAllEnvs();
  });

  it('auto-opens the wizard after profile sync when onboarding is incomplete', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    setUserMode(UserMode.Owner);
    markSiteProfileReadyForTests();
    markSiteSetupAvailableForTests();
    setSiteProfileStateForTests({ profile: { onboardingComplete: false, hubName: 'Test Hub' } });
    navigate('home');

    applyHubSetupRoutePolicy();

    expect(getCurrentRoute()).toBe('hub-setup');
  });

  it('does not auto-open the wizard on route changes alone', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    setUserMode(UserMode.Owner);
    markSiteProfileReadyForTests();
    markSiteSetupAvailableForTests();
    setSiteProfileStateForTests({ profile: { onboardingComplete: false, hubName: 'Test Hub' } });
    navigate('settings');

    applyHubSetupRoutePolicy({ routeChange: true });

    expect(getCurrentRoute()).toBe('settings');
  });

  it('leaves hub-setup on route change when onboarding is complete', () => {
    markSiteProfileReadyForTests();
    setSiteProfileStateForTests({ profile: { onboardingComplete: true, hubName: 'Test Hub' } });
    navigate('hub-setup');

    applyHubSetupRoutePolicy({ routeChange: true });

    expect(getCurrentRoute()).toBe('home');
  });

  it('keeps hub-setup open during a re-run request', () => {
    markSiteProfileReadyForTests();
    setSiteProfileStateForTests({ profile: { onboardingComplete: true, hubName: 'Test Hub' } });
    requestHubSetupWizardRerun();
    navigate('hub-setup');

    applyHubSetupRoutePolicy({ routeChange: true });

    expect(getCurrentRoute()).toBe('hub-setup');
  });
});
