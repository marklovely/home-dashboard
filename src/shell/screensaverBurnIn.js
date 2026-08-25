export const REPOSITION_INTERVAL_MS = 90_000;
export const MAX_SHIFT_X_VW = 8;
export const MAX_SHIFT_Y_VH = 6;
export const BIN_ALERT_MAX_SHIFT_X_VW = 12;
export const BIN_ALERT_MAX_SHIFT_Y_VH = 10;

/** @type {number | null} */
let repositionTimer = null;

/** @type {number | null} */
let binAlertRepositionTimer = null;

/**
 * @param {number} maxX
 * @param {number} maxY
 * @returns {{ x: number, y: number }}
 */
export function randomShift(maxX, maxY) {
  return {
    x: (Math.random() * 2 - 1) * maxX,
    y: (Math.random() * 2 - 1) * maxY
  };
}

/**
 * @returns {{ x: number, y: number }}
 */
export function randomPanelShift() {
  return randomShift(MAX_SHIFT_X_VW, MAX_SHIFT_Y_VH);
}

/**
 * @returns {{ x: number, y: number }}
 */
export function randomBinAlertShift() {
  return randomShift(BIN_ALERT_MAX_SHIFT_X_VW, BIN_ALERT_MAX_SHIFT_Y_VH);
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
 * @param {HTMLElement} host
 * @param {{ x: number, y: number }} shift
 * @param {boolean} animated
 */
export function applyBinAlertShift(host, shift, animated) {
  host.style.setProperty('--screensaver-bin-shift-x', `${shift.x}vw`);
  host.style.setProperty('--screensaver-bin-shift-y', `${shift.y}vh`);
  host.classList.toggle('screensaver-bin-alert-host--shift-instant', !animated);
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
 * @param {HTMLElement} host
 */
export function startBinAlertBurnInProtection(host) {
  stopBinAlertBurnInProtection(host);
  applyBinAlertShift(host, randomBinAlertShift(), false);
  binAlertRepositionTimer = window.setInterval(() => {
    applyBinAlertShift(host, randomBinAlertShift(), true);
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

/**
 * @param {HTMLElement} host
 */
export function stopBinAlertBurnInProtection(host) {
  if (binAlertRepositionTimer !== null) {
    window.clearInterval(binAlertRepositionTimer);
    binAlertRepositionTimer = null;
  }
  host.style.removeProperty('--screensaver-bin-shift-x');
  host.style.removeProperty('--screensaver-bin-shift-y');
  host.classList.remove('screensaver-bin-alert-host--shift-instant');
}

/** @param {number | null} timer */
export function setRepositionTimerForTests(timer) {
  repositionTimer = timer;
}

/** @param {number | null} timer */
export function setBinAlertRepositionTimerForTests(timer) {
  binAlertRepositionTimer = timer;
}

export function resetBurnInProtectionForTests() {
  repositionTimer = null;
  binAlertRepositionTimer = null;
}
