import { timingSafeEqualString } from '../lib/timingSafeEqual.js';
import {
  ensureOwnerAuthAllowed,
  recordOwnerAuthFailure,
  recordOwnerAuthSuccess
} from '../lib/ownerAuthRateLimitClient.js';
import { authenticateRequest, hasRequiredRole } from '../lib/requestAuth.js';
import { issueOwnerUnlockResponse } from '../lib/deviceSessionAuth.js';
import { getConfiguredOwnerPin } from '../lib/hubSecrets.js';

/**
 * @param {boolean} authenticated
 * @param {number} status
 * @param {string} [error]
 * @param {string} [code]
 */
function authJson(authenticated, status, error, code) {
  const body = {
    ok: authenticated,
    authenticated
  };
  if (error) body.error = error;
  if (code) body.code = code;
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
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
    return authJson(false, accessAuth.status, 'Authentication required', accessAuth.code);
  }

  if (!hasRequiredRole(accessAuth, 'owner')) {
    return authJson(false, 403, 'Owner access not permitted for this identity');
  }

  const configuredPin = await getConfiguredOwnerPin(env);
  if (!configuredPin) {
    return authJson(false, 503, 'Owner access is unavailable');
  }

  if (!(await ensureOwnerAuthAllowed(request, env))) {
    return authJson(false, 429, 'Too many attempts. Please wait before trying again.');
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
    return issueOwnerUnlockResponse();
  }

  await recordOwnerAuthFailure(request, env);
  return authJson(false, 401, 'Invalid credentials', 'INVALID_PIN');
}
