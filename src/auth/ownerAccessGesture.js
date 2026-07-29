import { isOwnerAccessAllowed } from './deploymentMode.js';
import { getOwnerAccessToken } from './ownerAccessToken.js';
import { isHouseSitterExperience } from './userMode.js';
import { openOwnerPinDialog } from '../components/OwnerAccess/ownerPinDialog.js';

const HOLD_MS = 5000;

/** House sitter unlock, or owner UI without a private API session (e.g. My Day). */
export function canPromptOwnerPinUnlock() {
  if (!isOwnerAccessAllowed()) return false;
  if (isHouseSitterExperience()) return true;
  return !getOwnerAccessToken();
}

/**
 * Opens the owner PIN dialog when permitted.
 * @param {{ onSuccess?: () => void, host?: HTMLElement | null }} [options]
 * @returns {boolean}
 */
export function promptOwnerPinUnlock(options = {}) {
  if (!canPromptOwnerPinUnlock()) return false;
  const host = options.host ?? document.querySelector('#owner-access-host');
  if (!host) return false;
  openOwnerPinDialog({
    host,
    onSuccess: options.onSuccess
  });
  return true;
}

/**
 * @param {HTMLElement} element
 * @param {() => void} onHoldComplete
 * @param {(active: boolean) => void} [onHoldStateChange]
 */
function attachHoldTarget(element, onHoldComplete, onHoldStateChange) {
  /** @type {number | null} */
  let holdTimer = null;

  const clearHold = () => {
    if (holdTimer !== null) {
      window.clearTimeout(holdTimer);
      holdTimer = null;
    }
    onHoldStateChange?.(false);
  };

  const startHold = () => {
    clearHold();
    onHoldStateChange?.(true);
    holdTimer = window.setTimeout(() => {
      holdTimer = null;
      onHoldStateChange?.(false);
      onHoldComplete();
    }, HOLD_MS);
  };

  element.addEventListener('pointerdown', (event) => {
    if ('button' in event && event.button !== 0) return;
    startHold();
  });
  element.addEventListener('pointerup', clearHold);
  element.addEventListener('pointercancel', clearHold);
  element.addEventListener('contextmenu', (event) => {
    if (canPromptOwnerPinUnlock() && isHouseSitterExperience()) event.preventDefault();
  });
}

/**
 * @param {Object} options
 * @param {HTMLElement | HTMLElement[]} options.logoElements
 * @param {HTMLElement} [options.holdFeedbackElement]
 * @param {HTMLElement} options.dialogHost
 * @param {() => void} [options.onOwnerUnlocked]
 */
export function attachOwnerAccessGesture({ logoElements, holdFeedbackElement, dialogHost, onOwnerUnlocked }) {
  const targets = (Array.isArray(logoElements) ? logoElements : [logoElements]).filter(Boolean);
  if (!targets.length || !dialogHost) return;

  const openDialog = () => {
    promptOwnerPinUnlock({ host: dialogHost, onSuccess: () => onOwnerUnlocked?.() });
  };

  const onHoldStateChange = (active) => {
    if (holdFeedbackElement) {
      holdFeedbackElement.classList.toggle('is-owner-hold-active', active && canPromptOwnerPinUnlock());
    }
  };

  for (const element of targets) {
    attachHoldTarget(element, openDialog, onHoldStateChange);
  }
}
