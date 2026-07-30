/** @typedef {'owner' | 'house-sitter'} LovelyHomeRole */

/** @type {Record<string, LovelyHomeRole[]>} */
export const CONTROL_PERMISSIONS = Object.freeze({
  VB01: ['owner', 'house-sitter'],
  VB02: ['owner', 'house-sitter'],
  VB09: ['owner', 'house-sitter'],
  VB08: ['owner', 'house-sitter'],
  VB10: ['owner', 'house-sitter'],
  VB03: ['owner'],
  VB04: ['owner'],
  VB05: ['owner'],
  VB06: ['owner'],
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
