import { timingSafeEqualString } from '../lib/timingSafeEqual.js';
import {
  ensureOwnerAuthAllowed,
  recordOwnerAuthFailure,
  recordOwnerAuthSuccess
} from '../lib/ownerAuthRateLimitClient.js';
import { authenticateRequest, hasRequiredRole } from '../lib/requestAuth.js';

/**
 * @param {boolean} authenticated
 * @param {number} status
 * @param {string} [error]
 */
function authJson(authenticated, status, error) {
  const body = {
    ok: authenticated,
    authenticated
  };
  if (error) body.error = error;
  return Response.json(body, { status });
}

/**
 * @param {unknown} pin
 */
function normalizePin(pin) {
  if (typeof pin !== 'string') return null;
  const trimmed = pin.trim();
  if (!/^\d{4}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * @param {Request} request
 * @param {string} correlationId
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleOwnerAuth(request, correlationId, env, fetchImpl = fetch) {
  if (request.method !== 'POST') {
    return authJson(false, 405, 'Method not allowed');
  }

  const accessAuth = await authenticateRequest(request, env, fetchImpl);
  if (!accessAuth.ok) {
    return authJson(false, accessAuth.status, 'Authentication required');
  }

  if (!hasRequiredRole(accessAuth, 'owner')) {
    return authJson(false, 403, 'Owner access not permitted for this identity');
  }

  const configuredPin = env.OWNER_PIN?.trim();
  if (!configuredPin) {
    return authJson(false, 503, 'Owner access is unavailable');
  }

  if (!(await ensureOwnerAuthAllowed(request, env))) {
    return authJson(false, 429, 'Too many attempts. Try again later.');
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return authJson(false, 400, 'Invalid request');
  }

  if (typeof body?.role === 'string') {
    /* ignore client-supplied role */
  }

  const pin = normalizePin(body?.pin);
  if (!pin) {
    return authJson(false, 400, 'Invalid request');
  }

  const valid = timingSafeEqualString(pin, configuredPin);
  if (valid) {
    await recordOwnerAuthSuccess(request, env);
    const { issueOwnerToken } = await import('../lib/ownerToken.js');
    const session = await issueOwnerToken(env);
    if (session) {
      return Response.json(
        { ok: true, authenticated: true, token: session.token, expiresAt: session.expiresAt },
        { status: 200 }
      );
    }
    return authJson(false, 503, 'Owner session unavailable');
  }

  await recordOwnerAuthFailure(request, env);
  return authJson(false, 401, 'Invalid credentials');
}
