import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserMode, resetUserModeForTests, setUserMode } from '../src/auth/userMode.js';
import {
  getScreensaverSetting,
  getScreensaverTimeoutMinutes,
  initScreensaverService,
  recordScreensaverActivity,
  resetScreensaverForTests,
  screensaverSettingLabel,
  screensaverTimeoutMsForTests,
  setLastActivityForTests,
  setScreensaverSetting,
  setScreensaverTimeoutMinutes,
  shouldShowScreensaver
} from '../src/services/screensaverService.js';

describe('screensaverService', () => {
  beforeEach(() => {
    localStorage.clear();
    resetScreensaverForTests();
    resetUserModeForTests();
    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'house-sitter');
    setUserMode(UserMode.HouseSitter);
    initScreensaverService();
  });

  afterEach(() => {
    resetScreensaverForTests();
    resetUserModeForTests();
    localStorage.clear();
    vi.unstubAllEnvs();
  });

  it('defaults to on with a 15 minute timeout', () => {
    expect(getScreensaverSetting()).toBe('on');
    expect(getScreensaverTimeoutMinutes()).toBe(15);
    expect(screensaverSettingLabel()).toBe('On (after 15 minutes)');
  });

  it('shows the screensaver after the configured idle timeout', () => {
    const now = Date.now();
    setLastActivityForTests(now - screensaverTimeoutMsForTests() - 1000);
    expect(shouldShowScreensaver(new Date(now))).toBe(true);
  });

  it('hides the screensaver while recently active', () => {
    recordScreensaverActivity();
    expect(shouldShowScreensaver()).toBe(false);
  });

  it('shows screensaver only in house sitter experience', () => {
    const idleAt = Date.now() - screensaverTimeoutMsForTests() - 1000;
    setLastActivityForTests(idleAt);
    expect(shouldShowScreensaver(new Date())).toBe(true);

    vi.stubEnv('VITE_DEPLOYMENT_MODE', 'home');
    resetUserModeForTests();
    setUserMode(UserMode.Owner);
    expect(shouldShowScreensaver(new Date())).toBe(false);
  });

  it('respects off setting and custom timeout', () => {
    setScreensaverSetting('off');
    setLastActivityForTests(Date.now() - 60 * 60 * 1000);
    expect(shouldShowScreensaver()).toBe(false);

    setScreensaverSetting('on');
    setScreensaverTimeoutMinutes(5);
    setLastActivityForTests(Date.now() - 6 * 60 * 1000);
    expect(shouldShowScreensaver()).toBe(true);
    expect(localStorage.getItem('home-hub-screensaver-timeout-minutes')).toBe('5');
  });

  it('migrates legacy night mode auto setting', () => {
    localStorage.setItem('home-hub-night-mode', 'auto');
    resetScreensaverForTests();
    initScreensaverService();
    expect(getScreensaverSetting()).toBe('on');
  });
});
