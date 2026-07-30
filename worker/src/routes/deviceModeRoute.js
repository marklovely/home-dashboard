import {
  requireOwnerIdentity,
  issueSitterSessionResponse
} from '../lib/deviceSessionAuth.js';
import { resolveDeviceSession } from '../lib/deviceSession.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleDeviceMode(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const ownerCheck = await requireOwnerIdentity(request, env, fetchImpl);
  if (!ownerCheck.ok) {
    return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
  }

  const session = await resolveDeviceSession(request, env);
  if (session.mode === 'sitter') {
    return Response.json({ error: 'ALREADY_IN_SITTER_MODE' }, { status: 400 });
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

  return issueSitterSessionResponse(env);
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

  return issueSitterSessionResponse(env);
}
