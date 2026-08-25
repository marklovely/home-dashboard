import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  BIN_ALERT_MAX_SHIFT_X_VW,
  BIN_ALERT_MAX_SHIFT_Y_VH,
  MAX_SHIFT_X_VW,
  MAX_SHIFT_Y_VH,
  applyBinAlertShift,
  applyPanelShift,
  randomBinAlertShift,
  randomPanelShift,
  resetBurnInProtectionForTests,
  startBinAlertBurnInProtection,
  startBurnInProtection,
  stopBinAlertBurnInProtection,
  stopBurnInProtection
} from '../src/shell/screensaverBurnIn.js';

describe('screensaverBurnIn', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetBurnInProtectionForTests();
  });

  it('generates panel shifts within the configured bounds', () => {
    for (let index = 0; index < 20; index += 1) {
      const shift = randomPanelShift();
      expect(Math.abs(shift.x)).toBeLessThanOrEqual(MAX_SHIFT_X_VW);
      expect(Math.abs(shift.y)).toBeLessThanOrEqual(MAX_SHIFT_Y_VH);
    }
  });

  it('generates bin alert shifts within the configured bounds', () => {
    for (let index = 0; index < 20; index += 1) {
      const shift = randomBinAlertShift();
      expect(Math.abs(shift.x)).toBeLessThanOrEqual(BIN_ALERT_MAX_SHIFT_X_VW);
      expect(Math.abs(shift.y)).toBeLessThanOrEqual(BIN_ALERT_MAX_SHIFT_Y_VH);
    }
  });

  it('applies and clears panel shift styles', () => {
    const panel = document.createElement('div');
    panel.className = 'screensaver-panel';

    applyPanelShift(panel, { x: 3, y: -2 }, true);
    expect(panel.style.getPropertyValue('--screensaver-shift-x')).toBe('3vw');
    expect(panel.style.getPropertyValue('--screensaver-shift-y')).toBe('-2vh');
    expect(panel.classList.contains('screensaver-panel--shift-instant')).toBe(false);

    applyPanelShift(panel, { x: -1, y: 4 }, false);
    expect(panel.classList.contains('screensaver-panel--shift-instant')).toBe(true);

    stopBurnInProtection(panel);
    expect(panel.style.getPropertyValue('--screensaver-shift-x')).toBe('');
    expect(panel.style.getPropertyValue('--screensaver-shift-y')).toBe('');
    expect(panel.classList.contains('screensaver-panel--shift-instant')).toBe(false);
  });

  it('applies and clears bin alert shift styles', () => {
    const host = document.createElement('div');
    host.className = 'screensaver-bin-alert-host';

    applyBinAlertShift(host, { x: 4, y: -3 }, true);
    expect(host.style.getPropertyValue('--screensaver-bin-shift-x')).toBe('4vw');
    expect(host.style.getPropertyValue('--screensaver-bin-shift-y')).toBe('-3vh');
    expect(host.classList.contains('screensaver-bin-alert-host--shift-instant')).toBe(false);

    stopBinAlertBurnInProtection(host);
    expect(host.style.getPropertyValue('--screensaver-bin-shift-x')).toBe('');
    expect(host.style.getPropertyValue('--screensaver-bin-shift-y')).toBe('');
  });

  it('starts and stops panel reposition timers', () => {
    vi.spyOn(window, 'setInterval').mockReturnValue(42);
    vi.spyOn(window, 'clearInterval');

    const panel = document.createElement('div');
    startBurnInProtection(panel);
    expect(window.setInterval).toHaveBeenCalledTimes(1);

    stopBurnInProtection(panel);
    expect(window.clearInterval).toHaveBeenCalledWith(42);
  });

  it('starts and stops bin alert reposition timers', () => {
    vi.spyOn(window, 'setInterval').mockReturnValue(84);
    vi.spyOn(window, 'clearInterval');

    const host = document.createElement('div');
    startBinAlertBurnInProtection(host);
    expect(window.setInterval).toHaveBeenCalledTimes(1);

    stopBinAlertBurnInProtection(host);
    expect(window.clearInterval).toHaveBeenCalledWith(84);
  });
});
