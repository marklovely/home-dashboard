import { authenticateRequest, hasRequiredRole } from './requestAuth.js';
import {
  applyDeviceSessionHeaders,
  attachClearDeviceSessionCookie,
  createSitterClaims,
  deviceSessionJsonBody,
  resolveDeviceSession,
  signDeviceSession
} from './deviceSession.js';

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
 * Owner APIs: Cloudflare Access owner identity and no active sitter device cookie.
 *
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
  if (session.mode === 'sitter') {
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
 * @param {Record<string, string | undefined>} env
 * @param {number} [nowSec]
 */
export async function issueSitterSessionResponse(env, nowSec = Math.floor(Date.now() / 1000)) {
  const claims = createSitterClaims(nowSec);
  const cookieValue = await signDeviceSession(claims, env);
  if (!cookieValue) {
    return Response.json({ error: 'SESSION_UNAVAILABLE' }, { status: 503 });
  }
  const body = deviceSessionJsonBody({ mode: 'sitter', ownerSessionExpiresAtMs: null });
  return applyDeviceSessionHeaders(
    Response.json(body, { status: 200, headers: { 'Cache-Control': 'no-store' } }),
    { cookieValue, claims, clearCookie: false }
  );
}

/**
 * Clears any sitter lock cookie and returns owner mode (Access remains required).
 */
export async function issueOwnerUnlockResponse() {
  const body = deviceSessionJsonBody({ mode: 'owner', ownerSessionExpiresAtMs: null });
  return attachClearDeviceSessionCookie(
    Response.json(body, { status: 200, headers: { 'Cache-Control': 'no-store' } })
  );
}

/** @deprecated Use issueOwnerUnlockResponse */
export const issueOwnerSessionResponse = issueOwnerUnlockResponse;
