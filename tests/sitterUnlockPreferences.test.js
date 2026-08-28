import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resetDeviceSessionStoreForTests,
  setDeviceModeForTests
} from '../src/auth/deviceSessionStore.js';
import { resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';
import { resetOwnerSessionForTests } from '../src/auth/ownerSession.js';
import { UserMode, resetUserModeForTests, setUserMode } from '../src/auth/userMode.js';
import {
  canUseLogoHoldUnlock,
  canUseSettingsPinUnlock,
  formatOwnerUnlockInstructions,
  normalizeSitterUnlock,
  readSitterUnlockFromProfile
} from '../src/lib/sitterUnlockPreferences.js';
import { resetSiteProfileStateForTests, setSiteProfileStateForTests } from '../src/services/siteProfileService.js';

describe('sitterUnlockPreferences', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetUserModeForTests();
    resetOwnerSessionForTests();
    resetDeviceSessionStoreForTests();
    resetSiteProfileStateForTests();
    resetHubEnvironmentForTests();
  });

  it('defaults both unlock methods on', () => {
    expect(readSitterUnlockFromProfile({})).toEqual({ logoHold: true, settingsButton: true });
  });

  it('requires at least one unlock method', () => {
    expect(normalizeSitterUnlock({ logoHold: false, settingsButton: false })).toEqual({
      logoHold: true,
      settingsButton: true
    });
  });

  it('formats instructions for configured methods', () => {
    setSiteProfileStateForTests({
      profile: { sitterUnlock: { logoHold: false, settingsButton: true } }
    });
    expect(formatOwnerUnlockInstructions()).toContain('Unlock owner mode');
    expect(formatOwnerUnlockInstructions()).not.toContain('logo');
  });

  it('allows logo hold only when the tablet is sitter-locked', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    setUserMode(UserMode.HouseSitter);
    setDeviceModeForTests('owner');
    expect(canUseLogoHoldUnlock()).toBe(false);

    setDeviceModeForTests('sitter');
    expect(canUseLogoHoldUnlock()).toBe(true);
  });

  it('disables unlock gestures on the demo hub', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'demo');
    resetHubEnvironmentForTests();
    setUserMode(UserMode.HouseSitter);
    setDeviceModeForTests('sitter');
    expect(canUseLogoHoldUnlock()).toBe(false);
    expect(canUseSettingsPinUnlock()).toBe(false);
  });
});
