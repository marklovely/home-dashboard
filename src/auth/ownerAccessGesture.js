import { isHomeDeployment } from '../auth/deploymentMode.js';
import { isHouseSitterExperience } from '../auth/userMode.js';
import { openOwnerPinDialog } from '../components/OwnerAccess/ownerPinDialog.js';

const HOLD_MS = 5000;

/**
 * @param {Object} options
 * @param {HTMLElement} options.logoElement
 * @param {HTMLElement} options.dialogHost
 * @param {() => void} [options.onOwnerUnlocked]
 */
export function attachOwnerAccessGesture({ logoElement, dialogHost, onOwnerUnlocked }) {
  if (!logoElement || !dialogHost) return;

  /** @type {number | null} */
  let holdTimer = null;

  const clearHold = () => {
    if (holdTimer !== null) {
      window.clearTimeout(holdTimer);
      holdTimer = null;
    }
  };

  const canUseGesture = () => isHomeDeployment() && isHouseSitterExperience();

  const startHold = () => {
    if (!canUseGesture()) return;
    clearHold();
    holdTimer = window.setTimeout(() => {
      holdTimer = null;
      if (!canUseGesture()) return;
      openOwnerPinDialog({
        host: dialogHost,
        onSuccess: () => onOwnerUnlocked?.()
      });
    }, HOLD_MS);
  };

  logoElement.addEventListener('pointerdown', startHold);
  logoElement.addEventListener('pointerup', clearHold);
  logoElement.addEventListener('pointerleave', clearHold);
  logoElement.addEventListener('pointercancel', clearHold);
  logoElement.addEventListener('contextmenu', (event) => {
    if (canUseGesture()) event.preventDefault();
  });
}
