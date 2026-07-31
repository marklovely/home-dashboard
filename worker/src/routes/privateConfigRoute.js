import { buildPrivateConfig } from './privateConfig.js';
import { requirePrivateConfigAccess } from '../lib/privateConfigAuth.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handlePrivateConfigRequest(request, env, fetchImpl = fetch) {
  const gate = await requirePrivateConfigAccess(request, env, fetchImpl);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  return Response.json(buildPrivateConfig(env), {
    headers: { 'Cache-Control': 'no-store' }
  });
}

export { buildPrivateConfig };
