import { buildPrivateConfig } from './privateConfig.js';
import { requireOwnerDeviceMode } from '../lib/deviceSessionAuth.js';

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

  return Response.json(buildPrivateConfig(env), {
    headers: { 'Cache-Control': 'no-store' }
  });
}

export { buildPrivateConfig };
