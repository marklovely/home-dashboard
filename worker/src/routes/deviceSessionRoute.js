import { authenticateRequest } from '../lib/requestAuth.js';
import {
  finalizeDeviceSessionJsonResponse,
  resolveAuthenticatedDeviceSession
} from '../lib/deviceSession.js';
import { getEffectiveSitterAccessState } from '../lib/sitterSchedule.js';
import { getPublicHubBranding } from '../lib/siteProfile.js';
import { listSitterStays, resolveMyStayForWelcome } from '../lib/sitterStays.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleDeviceSession(request, env, fetchImpl = fetch) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const access = await authenticateRequest(request, env, fetchImpl);
  if (!access.ok) {
    return Response.json(
      { authenticated: false, error: access.code },
      { status: access.status, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const session = await resolveAuthenticatedDeviceSession(request, env, access);
  const nowSec = Math.floor(Date.now() / 1000);
  const [accessState, hubBranding, stays] = await Promise.all([
    getEffectiveSitterAccessState(env, nowSec),
    getPublicHubBranding(env),
    listSitterStays(env, nowSec)
  ]);

  /** @type {Record<string, unknown>} */
  const extras = {
    sitterSecretsDisclosed: accessState.effectiveSecrets,
    ...hubBranding
  };

  if (session.mode === 'sitter') {
    extras.myStay = resolveMyStayForWelcome(access, stays, nowSec);
  }

  return finalizeDeviceSessionJsonResponse(session, 200, extras);
}
