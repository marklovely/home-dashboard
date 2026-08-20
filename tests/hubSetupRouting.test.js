import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetRouterForTests, navigate } from '../src/shell/router.js';
import { resetUserModeForTests, setUserMode, UserMode } from '../src/auth/userMode.js';
import {
  markSiteProfileReadyForTests,
  resetSiteProfileStateForTests,
  setSiteProfileStateForTests
} from '../src/services/siteProfileService.js';
import {
  clearHubSetupWizardForcedOpen,
  clearHubSetupWizardRerunRequest,
  requestHubSetupWizardAfterReset,
  requestHubSetupWizardRerun,
  resetHubSetupWizardStateForTests
} from '../src/apps/HubSetup/hubSetupWizardState.js';
import {
  shouldAllowHubSetupWizard,
  shouldAutoOpenHubSetupWizard,
  shouldLeaveHubSetupWizard
} from '../src/apps/HubSetup/hubSetupRouting.js';

describe('hubSetupRouting', () => {
  afterEach(() => {
    resetHubSetupWizardStateForTests();
    resetSiteProfileStateForTests();
    resetRouterForTests();
    resetUserModeForTests();
    vi.unstubAllEnvs();
  });

  it('waits for profile sync before opening the wizard on refresh', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    setUserMode(UserMode.Owner);
    setSiteProfileStateForTests({ profile: { onboardingComplete: false, hubName: 'Test Hub' } });

    expect(shouldAutoOpenHubSetupWizard()).toBe(false);
  });

  it('does not allow the wizard once onboarding is complete', () => {
    markSiteProfileReadyForTests();
    setSiteProfileStateForTests({ profile: { onboardingComplete: true, hubName: 'Test Hub' } });

    expect(shouldAllowHubSetupWizard()).toBe(false);
  });

  it('allows a forced wizard open after factory reset before sync settles', () => {
    requestHubSetupWizardAfterReset();
    expect(shouldAllowHubSetupWizard()).toBe(true);
  });

  it('leaves hub-setup when onboarding is complete unless re-run was requested', () => {
    markSiteProfileReadyForTests();
    setSiteProfileStateForTests({ profile: { onboardingComplete: true, hubName: 'Test Hub' } });
    navigate('hub-setup');

    expect(shouldLeaveHubSetupWizard()).toBe(true);

    requestHubSetupWizardRerun();
    expect(shouldLeaveHubSetupWizard()).toBe(false);

    clearHubSetupWizardRerunRequest();
    requestHubSetupWizardAfterReset();
    expect(shouldLeaveHubSetupWizard()).toBe(false);
    clearHubSetupWizardForcedOpen();
  });
});
