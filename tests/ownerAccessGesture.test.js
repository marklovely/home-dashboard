import { afterEach, describe, expect, it, vi } from 'vitest';
import { isHomeDeployment } from '../src/auth/deploymentMode.js';
import { attachOwnerAccessGesture } from '../src/auth/ownerAccessGesture.js';
import { resetOwnerSessionForTests } from '../src/auth/ownerSession.js';
import {
  UserMode,
  isHouseSitterExperience,
  resetUserModeForTests,
  setUserMode
} from '../src/auth/userMode.js';

describe('owner access gesture', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    resetUserModeForTests();
    resetOwnerSessionForTests();
    vi.useRealTimers();
  });

  it('does nothing on house sitter deployment', () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    resetUserModeForTests();
    const logo = document.createElement('p');
    const host = document.createElement('div');
    attachOwnerAccessGesture({ logoElements: logo, dialogHost: host });

    logo.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    vi.advanceTimersByTime(6000);
    expect(host.childElementCount).toBe(0);
  });

  it('opens dialog on home deployment while in guest mode after hold', () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.HouseSitter);
    expect(isHomeDeployment()).toBe(true);
    expect(isHouseSitterExperience()).toBe(true);

    const logo = document.createElement('p');
    const host = document.createElement('div');
    attachOwnerAccessGesture({ logoElements: logo, dialogHost: host });

    logo.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    vi.advanceTimersByTime(5000);
    expect(host.querySelector('.owner-pin-overlay')).toBeTruthy();
  });

  it('does not open dialog while already in owner mode', () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.Owner);

    const logo = document.createElement('p');
    const host = document.createElement('div');
    attachOwnerAccessGesture({ logoElements: logo, dialogHost: host });

    logo.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    vi.advanceTimersByTime(5000);
    expect(host.querySelector('.owner-pin-overlay')).toBeNull();
  });
});
