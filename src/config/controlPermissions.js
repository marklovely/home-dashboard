/**
 * House-sitter allowed Virtual Button IDs — keep in sync with worker/src/lib/controlPermissions.js
 *
 * Sitters and guests must not trigger Alexa routines or other home controls.
 */
export const SITTER_ALLOWED_BUTTON_IDS = Object.freeze([]);

/**
 * @param {number} buttonId
 */
export function isButtonAllowedForSitter(buttonId) {
  return SITTER_ALLOWED_BUTTON_IDS.includes(buttonId);
}
