import { isOwnerAccessAllowed } from './deploymentMode.js';
import { isHouseSitterExperience } from './userMode.js';
import { openOwnerPinDialog } from '../components/OwnerAccess/ownerPinDialog.js';

const HOLD_MS = 5000;

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
    if (isOwnerAccessAllowed() && isHouseSitterExperience()) event.preventDefault();
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

  const canUseGesture = () => isOwnerAccessAllowed() && isHouseSitterExperience();

  const openDialog = () => {
    if (!canUseGesture()) return;
    openOwnerPinDialog({
      host: dialogHost,
      onSuccess: () => onOwnerUnlocked?.()
    });
  };

  const onHoldStateChange = (active) => {
    if (holdFeedbackElement) {
      holdFeedbackElement.classList.toggle('is-owner-hold-active', active && canUseGesture());
    }
  };

  for (const element of targets) {
    attachHoldTarget(element, openDialog, onHoldStateChange);
  }
}
