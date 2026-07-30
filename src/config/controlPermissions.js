/**
 * House-sitter allowed Virtual Button IDs — keep in sync with worker/src/lib/controlPermissions.js
 */
export const SITTER_ALLOWED_BUTTON_IDS = Object.freeze([1, 2, 3, 4, 5, 6, 8, 9, 10]);

/**
 * @param {number} buttonId
 */
export function isButtonAllowedForSitter(buttonId) {
  return SITTER_ALLOWED_BUTTON_IDS.includes(buttonId);
}
