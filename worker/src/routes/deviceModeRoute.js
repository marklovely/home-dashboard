import { requireOwnerDeviceMode, requireOwnerIdentity, issueSitterSessionResponse } from '../lib/deviceSessionAuth.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleDeviceMode(request, env, _fetchImpl = fetch) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const ownerCheck = await requireOwnerDeviceMode(request, env);
  if (!ownerCheck.ok) {
    return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (body?.mode !== 'sitter') {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  return issueSitterSessionResponse(ownerCheck.session, env);
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleAuthLock(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const identity = await requireOwnerIdentity(request, env, fetchImpl);
  if (!identity.ok) {
    return Response.json({ error: identity.code }, { status: identity.status });
  }

  return issueSitterSessionResponse(null, env);
}
