import { buildPrivateConfig } from './privateConfig.js';
import { requireOwnerDeviceMode, renewOwnerSessionIfActive } from '../lib/deviceSessionAuth.js';
import { attachDeviceSessionCookie } from '../lib/deviceSession.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handlePrivateConfigRequest(request, env, _fetchImpl = fetch) {
  const gate = await requireOwnerDeviceMode(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  let response = Response.json(buildPrivateConfig(env), {
    headers: { 'Cache-Control': 'no-store' }
  });
  const renewed = await renewOwnerSessionIfActive(gate.session.claims, env);
  if (renewed) {
    response = attachDeviceSessionCookie(response, renewed.cookieValue, renewed.claims);
  }
  return response;
}

export { buildPrivateConfig };
