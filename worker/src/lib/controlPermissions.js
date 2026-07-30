/** @typedef {'owner' | 'house-sitter'} LovelyHomeRole */

/** @type {Record<string, LovelyHomeRole[]>} */
export const CONTROL_PERMISSIONS = Object.freeze({
  VB01: ['owner', 'house-sitter'],
  VB02: ['owner', 'house-sitter'],
  VB03: ['owner', 'house-sitter'],
  VB04: ['owner', 'house-sitter'],
  VB05: ['owner', 'house-sitter'],
  VB06: ['owner', 'house-sitter'],
  VB09: ['owner', 'house-sitter'],
  VB08: ['owner', 'house-sitter'],
  VB10: ['owner', 'house-sitter'],
  VB07: ['owner']
});

/**
 * @param {string} buttonCode
 * @param {LovelyHomeRole} role
 */
export function isControlAllowedForRole(buttonCode, role) {
  const allowed = CONTROL_PERMISSIONS[buttonCode];
  if (!allowed) return false;
  return allowed.includes(role);
}
