import { authenticateRequest, hasRequiredRole } from './requestAuth.js';
import {
  attachDeviceSessionCookie,
  createOwnerClaims,
  createSitterClaims,
  deviceSessionJsonBody,
  effectiveModeFromClaims,
  renewOwnerInactivity,
  resolveDeviceSession,
  signDeviceSession
} from './deviceSession.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function requireCloudflareAccess(request, env, fetchImpl = fetch) {
  return authenticateRequest(request, env, fetchImpl);
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function requireOwnerIdentity(request, env, fetchImpl = fetch) {
  const auth = await authenticateRequest(request, env, fetchImpl);
  if (!auth.ok) return { ok: false, status: auth.status, code: auth.code };
  if (!hasRequiredRole(auth, 'owner')) {
    return { ok: false, status: 403, code: 'FORBIDDEN' };
  }
  return { ok: true, auth };
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {number} [nowMs]
 */
export async function readDeviceMode(request, env, nowMs = Date.now()) {
  return resolveDeviceSession(request, env, nowMs);
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {number} [nowMs]
 */
export async function requireOwnerDeviceMode(request, env, nowMs = Date.now()) {
  const access = await authenticateRequest(request, env);
  if (!access.ok) {
    return { ok: false, status: access.status, code: access.code };
  }
  if (!hasRequiredRole(access, 'owner')) {
    return { ok: false, status: 403, code: 'FORBIDDEN' };
  }

  const session = await resolveDeviceSession(request, env, nowMs);
  if (session.mode !== 'owner') {
    return { ok: false, status: 403, code: 'DEVICE_MODE_REQUIRED' };
  }

  return { ok: true, access, session };
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function requireAnyDeviceSession(request, env) {
  const access = await authenticateRequest(request, env);
  if (!access.ok) {
    return { ok: false, status: access.status, code: access.code };
  }
  const session = await resolveDeviceSession(request, env);
  return { ok: true, access, session };
}

/**
 * @param {object} session
 * @param {Record<string, string | undefined>} env
 * @param {number} nowSec
 */
export async function issueSitterSessionResponse(session, env, nowSec = Math.floor(Date.now() / 1000)) {
  const claims = createSitterClaims(nowSec);
  const cookieValue = await signDeviceSession(claims, env);
  if (!cookieValue) {
    return Response.json({ error: 'SESSION_UNAVAILABLE' }, { status: 503 });
  }
  const body = deviceSessionJsonBody({ mode: 'sitter', ownerSessionExpiresAtMs: null });
  return attachDeviceSessionCookie(
    Response.json(body, { status: 200, headers: { 'Cache-Control': 'no-store' } }),
    cookieValue,
    claims
  );
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {number} [nowSec]
 */
export async function issueOwnerSessionResponse(env, nowSec = Math.floor(Date.now() / 1000)) {
  const claims = createOwnerClaims(nowSec);
  const cookieValue = await signDeviceSession(claims, env);
  if (!cookieValue) {
    return Response.json({ error: 'SESSION_UNAVAILABLE' }, { status: 503 });
  }
  const body = deviceSessionJsonBody({
    mode: 'owner',
    ownerSessionExpiresAtMs: claims.expiresAt * 1000
  });
  return attachDeviceSessionCookie(
    Response.json(body, { status: 200, headers: { 'Cache-Control': 'no-store' } }),
    cookieValue,
    claims
  );
}

/**
 * @param {import('./deviceSession.js').DeviceSessionClaims} claims
 * @param {Record<string, string | undefined>} env
 * @param {number} nowSec
 */
export async function renewOwnerSessionIfActive(claims, env, nowSec = Math.floor(Date.now() / 1000)) {
  if (effectiveModeFromClaims(claims, nowSec) !== 'owner') return null;
  const renewed = renewOwnerInactivity(claims, nowSec);
  const cookieValue = await signDeviceSession(renewed, env);
  if (!cookieValue) return null;
  return { claims: renewed, cookieValue };
}
