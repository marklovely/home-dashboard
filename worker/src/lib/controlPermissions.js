/** @typedef {'owner' | 'house-sitter'} LovelyHomeRole */

/** @type {Record<string, LovelyHomeRole[]>} */
export const CONTROL_PERMISSIONS = Object.freeze({
  VB01: ['owner'],
  VB02: ['owner'],
  VB03: ['owner'],
  VB04: ['owner'],
  VB05: ['owner'],
  VB06: ['owner'],
  VB07: ['owner'],
  VB08: ['owner'],
  VB09: ['owner'],
  VB10: ['owner']
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
