import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetDeviceSessionStoreForTests } from '../src/auth/deviceSessionStore.js';
import { markOwnerUnlockedByPin, resetOwnerSessionForTests } from '../src/auth/ownerSession.js';
import { UserMode, resetUserModeForTests, setUserMode } from '../src/auth/userMode.js';
import { shouldShowProfileSwitcher } from '../src/shell/profileSwitcher.js';

describe('profileSwitcher', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetUserModeForTests();
    resetOwnerSessionForTests();
    resetDeviceSessionStoreForTests();
  });

  it('shows on home deployment when the device is in owner mode', () => {
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    expect(shouldShowProfileSwitcher()).toBe(true);
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
});
