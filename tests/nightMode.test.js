import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMode, resetUserModeForTests, setUserMode } from '../src/auth/userMode.js';
import {
  getNightModeSetting,
  getNightModeWindow,
  getNightModeWindowInputValues,
  initNightModeService,
  isNightModeSnoozed,
  isWithinNightWindowForTests,
  nightModeSettingLabel,
  resetNightModeForTests,
  setNightModeSetting,
  setNightModeWindowForTests,
  setNightModeWindowFromInputs,
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

  it('defaults to auto night mode with midnight to 6am window', () => {
    expect(getNightModeSetting()).toBe('auto');
    expect(getNightModeWindow()).toEqual({
      start: { hour: 0, minute: 0 },
      end: { hour: 6, minute: 0 }
    });
    expect(getNightModeWindowInputValues()).toEqual({ start: '00:00', end: '06:00' });
  });

  it('detects the default midnight to 6am window', () => {
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 0, 30))).toBe(true);
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 5, 59))).toBe(true);
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 6, 0))).toBe(false);
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 23, 0))).toBe(false);
  });

  it('uses a custom configured schedule', () => {
    setNightModeWindowForTests({ hour: 22, minute: 30 }, { hour: 7, minute: 15 });
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 23, 0))).toBe(true);
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 7, 0))).toBe(true);
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 7, 15))).toBe(false);
    expect(isWithinNightWindowForTests(new Date(2026, 0, 1, 12, 0))).toBe(false);
    expect(nightModeSettingLabel()).toMatch(/22:30/);
    expect(nightModeSettingLabel()).toMatch(/07:15/);
  });

  it('persists custom schedule in localStorage', () => {
    expect(setNightModeWindowFromInputs('21:00', '05:30')).toBe(true);
    expect(localStorage.getItem('home-hub-night-mode-start')).toBe('21:00');
    expect(localStorage.getItem('home-hub-night-mode-end')).toBe('05:30');
  });

  it('rejects identical start and end times', () => {
    expect(setNightModeWindowFromInputs('02:00', '02:00')).toBe(false);
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

  it('persists on/off setting in localStorage', () => {
    setNightModeSetting('off');
    expect(localStorage.getItem('home-hub-night-mode')).toBe('off');
  });
});
