import { requireOwnerIdentity } from '../lib/deviceSessionAuth.js';
import { authenticateRequest } from '../lib/requestAuth.js';
import { getSitterSecretsDisclosed, setSitterSecretsDisclosed } from '../lib/houseSettings.js';

/**
 * @param {Record<string, string | undefined>} env
 */
export async function buildHouseSettingsPayload(env) {
  return {
    sitterSecretsDisclosed: await getSitterSecretsDisclosed(env)
  };
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleHouseSettingsGet(request, env, fetchImpl = fetch) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const access = await authenticateRequest(request, env, fetchImpl);
  if (!access.ok) {
    return Response.json({ error: access.code }, { status: access.status });
  }

  return Response.json(await buildHouseSettingsPayload(env), {
    headers: { 'Cache-Control': 'no-store' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleSitterSecretsSetting(request, env, fetchImpl = fetch) {
  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const ownerCheck = await requireOwnerIdentity(request, env, fetchImpl);
  if (!ownerCheck.ok) {
    return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (typeof body?.disclosed !== 'boolean') {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  try {
    await setSitterSecretsDisclosed(env, body.disclosed);
  } catch {
    return Response.json({ error: 'SETTINGS_UNAVAILABLE' }, { status: 503 });
  }

  return Response.json(await buildHouseSettingsPayload(env), {
    headers: { 'Cache-Control': 'no-store' }
  });
}
