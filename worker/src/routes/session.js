import { authenticateRequest } from '../lib/requestAuth.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleSession(request, env, fetchImpl = fetch) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const auth = await authenticateRequest(request, env, fetchImpl);
  if (!auth.ok) {
    return Response.json(
      { authenticated: false, error: auth.code },
      { status: auth.status, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }

  return Response.json(
    {
      authenticated: true,
      role: auth.role,
      displayName: null
    },
    { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
  );
}
