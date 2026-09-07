import { isSitterControlsDisclosed } from '../services/sitterControlsService.js';

/**
 * Sitters may use all configured Virtual Buttons only while an active sit has
 * disclosed controls (owner toggle or scheduled stay dates). Keep worker
 * button authorization aligned in worker/src/routes/buttons.js.
 *
 * @param {number} buttonId
 */
export function isButtonAllowedForSitter(buttonId) {
  if (!isSitterControlsDisclosed()) return false;
  return Number.isFinite(buttonId) && buttonId > 0;
}
