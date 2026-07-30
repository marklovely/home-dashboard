import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMode, resetUserModeForTests, setUserMode } from '../src/auth/userMode.js';
import {
  getNightModeSetting,
  initNightModeService,
  isNightModeSnoozed,
  isWithinNightWindowForTests,
  resetNightModeForTests,
  setNightModeSetting,
  shouldShowNightMode,
  snoozeNightMode
} from '../src/services/nightModeService.js';

describe('nightModeService', () => {
  beforeEach(() => {
    localStorage.clear();
    resetNightModeForTests();
    resetUserModeForTests();
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    setUserMode(UserMode.HouseSitter);
    initNightModeService();
  });

  afterEach(() => {
    resetNightModeForTests();
    resetUserModeForTests();
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('defaults to auto night mode', () => {
    expect(getNightModeSetting()).toBe('auto');
  });

  it('detects the midnight to 6am window', () => {
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 0, 30))).toBe(true);
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 5, 59))).toBe(true);
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 6, 0))).toBe(false);
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 23, 0))).toBe(false);
  });

  it('shows night mode only in house sitter experience during the window', () => {
    const night = new Date(2026, 0, 1, 1, 0);
    expect(shouldShowNightMode(night)).toBe(true);

    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.Owner);
    expect(shouldShowNightMode(night)).toBe(false);
  });

  it('respects off setting and snooze wake', () => {
    const night = new Date(2026, 0, 1, 1, 0);
    setNightModeSetting('off');
    expect(shouldShowNightMode(night)).toBe(false);

    setNightModeSetting('auto');
    snoozeNightMode();
    expect(isNightModeSnoozed(night)).toBe(true);
    expect(shouldShowNightMode(night)).toBe(false);
  });

  it('persists setting in localStorage', () => {
    setNightModeSetting('off');
    expect(localStorage.getItem('home-hub-night-mode')).toBe('off');
  });
});
