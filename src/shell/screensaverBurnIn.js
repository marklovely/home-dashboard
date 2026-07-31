export const REPOSITION_INTERVAL_MS = 90_000;
export const MAX_SHIFT_X_VW = 8;
export const MAX_SHIFT_Y_VH = 6;

/** @type {number | null} */
let repositionTimer = null;

/**
 * @returns {{ x: number, y: number }}
 */
export function randomPanelShift() {
  return {
    x: (Math.random() * 2 - 1) * MAX_SHIFT_X_VW,
    y: (Math.random() * 2 - 1) * MAX_SHIFT_Y_VH
  };
}

/**
 * @param {HTMLElement} panel
 * @param {{ x: number, y: number }} shift
 * @param {boolean} animated
 */
export function applyPanelShift(panel, shift, animated) {
  panel.style.setProperty('--screensaver-shift-x', `${shift.x}vw`);
  panel.style.setProperty('--screensaver-shift-y', `${shift.y}vh`);
  panel.classList.toggle('screensaver-panel--shift-instant', !animated);
}

/**
 * @param {HTMLElement} panel
 */
export function startBurnInProtection(panel) {
  stopBurnInProtection(panel);
  applyPanelShift(panel, randomPanelShift(), false);
  repositionTimer = window.setInterval(() => {
    applyPanelShift(panel, randomPanelShift(), true);
  }, REPOSITION_INTERVAL_MS);
}

/**
 * @param {HTMLElement} panel
 */
export function stopBurnInProtection(panel) {
  if (repositionTimer !== null) {
    window.clearInterval(repositionTimer);
    repositionTimer = null;
  }
  panel.style.removeProperty('--screensaver-shift-x');
  panel.style.removeProperty('--screensaver-shift-y');
  panel.classList.remove('screensaver-panel--shift-instant');
}

/** @param {number | null} timer */
export function setRepositionTimerForTests(timer) {
  repositionTimer = timer;
}

export function resetBurnInProtectionForTests() {
  repositionTimer = null;
}
