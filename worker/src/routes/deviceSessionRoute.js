import { authenticateRequest } from '../lib/requestAuth.js';
import {
  finalizeDeviceSessionJsonResponse,
  resolveAuthenticatedDeviceSession
} from '../lib/deviceSession.js';
import { getSitterSecretsDisclosed } from '../lib/houseSettings.js';
import { getPublicHubBranding } from '../lib/siteProfile.js';

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
  const [sitterSecretsDisclosed, hubBranding] = await Promise.all([
    getSitterSecretsDisclosed(env),
    getPublicHubBranding(env)
  ]);
  return finalizeDeviceSessionJsonResponse(session, 200, {
    sitterSecretsDisclosed,
    ...hubBranding
  });
}
