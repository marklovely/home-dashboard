import { buildPrivateConfig } from './privateConfig.js';
import { authenticateRequest } from '../lib/requestAuth.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handlePrivateConfigRequest(request, env, fetchImpl = fetch) {
  const auth = await authenticateRequest(request, env, fetchImpl);
  if (!auth.ok) {
    return Response.json({ error: auth.code }, { status: auth.status });
  }

  return Response.json(buildPrivateConfig(env), {
    headers: { 'Cache-Control': 'private, no-store' }
  });
}

export { buildPrivateConfig };
