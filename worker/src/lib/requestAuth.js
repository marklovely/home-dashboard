import { verifyAccessJwt, isAccessConfigured } from './accessJwt.js';
import { readAccessJwtFromRequest } from './accessJwtFromRequest.js';
import { resolveRoleFromEmail } from './accessRoles.js';

/** @typedef {'owner' | 'house-sitter'} LovelyHomeRole */

/**
 * @typedef {Object} AuthSuccess
 * @property {true} ok
 * @property {string} email
 * @property {LovelyHomeRole} role
 */

/**
 * @typedef {Object} AuthFailure
 * @property {false} ok
 * @property {number} status
 * @property {string} code
 */

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<AuthSuccess | AuthFailure>}
 */
export async function authenticateRequest(request, env, fetchImpl = fetch) {
  if (!isAccessConfigured(env)) {
    return { ok: false, status: 503, code: 'AUTH_NOT_CONFIGURED' };
  }

  const token = readAccessJwtFromRequest(request);
  if (!token) {
    return { ok: false, status: 401, code: 'UNAUTHENTICATED' };
  }

  const verified = await verifyAccessJwt(token, env, fetchImpl);
  if (!verified.ok) {
    return { ok: false, status: 401, code: 'INVALID_TOKEN' };
  }

  const role = resolveRoleFromEmail(verified.email, env);
  return { ok: true, email: verified.email, role };
}

/**
 * @param {AuthSuccess} auth
 * @param {LovelyHomeRole} requiredRole
 */
export function hasRequiredRole(auth, requiredRole) {
  if (requiredRole === 'house-sitter') return true;
  return auth.role === 'owner';
}
