import { afterEach, describe, expect, it, vi } from 'vitest';
import { lockToHouseSitterMode } from '../src/auth/ownerLock.js';
import {
  OWNER_INACTIVITY_TIMEOUT_MS,
  resetOwnerInactivityForTests,
  startOwnerInactivityWatch,
  stopOwnerInactivityWatch
} from '../src/auth/ownerInactivity.js';
import { markOwnerUnlockedByPin, resetOwnerSessionForTests } from '../src/auth/ownerSession.js';
import { UserMode, getUserMode, resetUserModeForTests, setUserMode } from '../src/auth/userMode.js';
import { setActiveProfileId } from '../src/services/profileService.js';

describe('owner inactivity lock', () => {
  afterEach(() => {
    vi.useRealTimers();
    resetOwnerInactivityForTests();
    resetOwnerSessionForTests();
    resetUserModeForTests();
    setActiveProfileId('owner');
  });

  it('locks to house sitter after inactivity timeout', () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.Owner);
    markOwnerUnlockedByPin();

    let navigated = false;
    startOwnerInactivityWatch(
      () => {
        lockToHouseSitterMode(() => {
          navigated = true;
        });
      },
      1000
    );

    vi.advanceTimersByTime(1000);
    expect(getUserMode()).toBe(UserMode.HouseSitter);
    expect(navigated).toBe(true);
    stopOwnerInactivityWatch();
  });

  it('resets timer on user activity', () => {
    vi.useFakeTimers();
    const callback = vi.fn();
    startOwnerInactivityWatch(callback, 5000);
    vi.advanceTimersByTime(4000);
    window.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(4000);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(callback).toHaveBeenCalledOnce();
    stopOwnerInactivityWatch();
  });

  it('uses a five minute default timeout constant', () => {
    expect(OWNER_INACTIVITY_TIMEOUT_MS).toBe(5 * 60 * 1000);
  });
});
