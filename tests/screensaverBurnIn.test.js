import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_SHIFT_X_VW,
  MAX_SHIFT_Y_VH,
  applyPanelShift,
  randomPanelShift,
  resetBurnInProtectionForTests,
  startBurnInProtection,
  stopBurnInProtection
} from '../src/shell/screensaverBurnIn.js';

describe('screensaverBurnIn', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetBurnInProtectionForTests();
  });

  it('generates shifts within the configured bounds', () => {
    for (let index = 0; index < 20; index += 1) {
      const shift = randomPanelShift();
      expect(Math.abs(shift.x)).toBeLessThanOrEqual(MAX_SHIFT_X_VW);
      expect(Math.abs(shift.y)).toBeLessThanOrEqual(MAX_SHIFT_Y_VH);
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

  it('starts and stops reposition timers', () => {
    vi.spyOn(window, 'setInterval').mockReturnValue(42);
    vi.spyOn(window, 'clearInterval');

    const panel = document.createElement('div');
    startBurnInProtection(panel);
    expect(window.setInterval).toHaveBeenCalledTimes(1);

    stopBurnInProtection(panel);
    expect(window.clearInterval).toHaveBeenCalledWith(42);
  });
});
