import { isAllowedButtonCode, BUTTON_CODE_TO_VIRTUAL_ID, normalizeButtonCode } from '../lib/buttonAllowlist.js';
import { jsonError } from '../lib/errors.js';
import { triggerVirtualButtonUpstream } from '../services/virtualButtons.js';
import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';
import { isControlAllowedForRole } from '../lib/controlPermissions.js';
import { ensureControlActionAllowed } from '../lib/controlRateLimitClient.js';
import { identityForLogs } from '../lib/auditLog.js';

/**
 * @param {Request} request
 */
function hasStrictJsonContentType(request) {
  const contentType = request.headers.get('Content-Type')?.split(';')[0]?.trim().toLowerCase();
  return contentType === 'application/json';
}

/**
 * @param {Request} request
 * @param {string} buttonParam
 * @param {Record<string, string | undefined>} env
 * @param {string} correlationId
 * @param {typeof fetch} fetchImpl
 */
export async function handleButtonPress(request, buttonParam, env, correlationId, fetchImpl = fetch) {
  if (request.method !== 'POST') {
    return jsonError(405, 'METHOD_NOT_ALLOWED', 'Use POST for this control.', { correlationId });
  }

  if (!hasStrictJsonContentType(request)) {
    return jsonError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json.', { correlationId });
  }

  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return jsonError(gate.status, gate.code, 'Authentication required.', { correlationId });
  }
  const auth = gate.access;

  const effectiveRole = gate.session.mode === 'owner' ? auth.role : 'house-sitter';

  const code = normalizeButtonCode(buttonParam);
  if (!code || !isAllowedButtonCode(code)) {
    logControlAction({
      correlationId,
      action: buttonParam,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: false,
      reason: 'UNKNOWN_BUTTON'
    });
    return jsonError(404, 'UNKNOWN_BUTTON', 'This control is not available.', { correlationId });
  }

  if (!isControlAllowedForRole(code, effectiveRole)) {
    logControlAction({
      correlationId,
      action: code,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: false,
      reason: 'FORBIDDEN'
    });
    return jsonError(403, 'FORBIDDEN', 'This control is not available.', { correlationId });
  }

  const rate = await ensureControlActionAllowed(request, auth.email, code, env);
  if (!rate.allowed) {
    logControlAction({
      correlationId,
      action: code,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: false,
      reason: rate.reason ?? 'RATE_LIMITED'
    });
    const status = rate.reason === 'DUPLICATE_COOLDOWN' ? 429 : 429;
    return jsonError(status, rate.reason ?? 'RATE_LIMITED', 'Please wait before trying again.', {
      correlationId
    });
  }

  const accessCode = env.VIRTUAL_BUTTONS_ACCESS_CODE?.trim();
  if (!accessCode) {
    return jsonError(503, 'CONFIGURATION_ERROR', 'Controls are temporarily unavailable.', { correlationId });
  }

  const virtualButtonId = BUTTON_CODE_TO_VIRTUAL_ID[code];
  try {
    await triggerVirtualButtonUpstream({
      accessCode,
      virtualButtonId,
      fetchImpl
    });
    logControlAction({
      correlationId,
      action: code,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: true
    });
    return Response.json({ ok: true, button: code }, { status: 200 });
  } catch (error) {
    logControlAction({
      correlationId,
      action: code,
      role: effectiveRole,
      identity: identityForLogs(auth.email),
      success: false,
      reason: 'UPSTREAM_ERROR'
    });
    const message = error instanceof Error && error.message === 'UPSTREAM_FAILED'
      ? 'Could not reach the control service.'
      : 'Could not trigger this control.';
    return jsonError(502, 'UPSTREAM_ERROR', message, { correlationId });
  }
}

/**
 * @param {Object} entry
 */
function logControlAction(entry) {
  console.log(
    JSON.stringify({
      event: 'control_action',
      timestamp: new Date().toISOString(),
      ...entry
    })
  );
}
