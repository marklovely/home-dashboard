import { isAllowedButtonCode, BUTTON_CODE_TO_VIRTUAL_ID, normalizeButtonCode } from '../lib/buttonAllowlist.js';
import { jsonError } from '../lib/errors.js';
import { triggerVirtualButtonUpstream } from '../services/virtualButtons.js';

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

  const code = normalizeButtonCode(buttonParam);
  if (!code || !isAllowedButtonCode(code)) {
    return jsonError(400, 'UNKNOWN_BUTTON', 'This control is not available.', { correlationId });
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
    return Response.json({ ok: true, button: code }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error && error.message === 'UPSTREAM_FAILED'
      ? 'Could not reach the control service.'
      : 'Could not trigger this control.';
    return jsonError(502, 'UPSTREAM_ERROR', message, { correlationId });
  }
}
