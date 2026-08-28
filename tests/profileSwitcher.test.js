import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetDeviceSessionStoreForTests, setDeviceModeForTests } from '../src/auth/deviceSessionStore.js';
import { resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';
import { markOwnerUnlockedByPin, resetOwnerSessionForTests } from '../src/auth/ownerSession.js';
import { UserMode, resetUserModeForTests, setUserMode } from '../src/auth/userMode.js';
import { navigate, resetRouterForTests } from '../src/shell/router.js';
import { shouldShowProfileSwitcher } from '../src/shell/profileSwitcher.js';

describe('profileSwitcher', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetUserModeForTests();
    resetOwnerSessionForTests();
    resetDeviceSessionStoreForTests();
    resetHubEnvironmentForTests();
    resetRouterForTests();
  });

  it('shows on home deployment when the device is in owner mode', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    expect(shouldShowProfileSwitcher()).toBe(true);
  });

  it('hides during the hub setup wizard', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    navigate('hub-setup');
    expect(shouldShowProfileSwitcher()).toBe(false);
  });

  it('hides on dedicated house sitter deployment', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    expect(shouldShowProfileSwitcher()).toBe(false);
  });

  it('shows after owner unlock on a sitter-locked device', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.HouseSitter);
    markOwnerUnlockedByPin();
    setUserMode(UserMode.Owner);
    expect(shouldShowProfileSwitcher()).toBe(true);
  });

  it('hides on a sitter-locked device until owner unlock', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.HouseSitter);
    setDeviceModeForTests('sitter');
    expect(shouldShowProfileSwitcher()).toBe(false);
  });

  it('shows on the demo hub even when the device session is sitter', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    vi.stubEnv('VITE_HUB_ENVIRONMENT', 'demo');
    resetHubEnvironmentForTests();
    resetUserModeForTests();
    setUserMode(UserMode.HouseSitter);
    setDeviceModeForTests('sitter');
    expect(shouldShowProfileSwitcher()).toBe(true);
  });
});
