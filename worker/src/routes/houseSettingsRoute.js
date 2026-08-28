import { requireOwnerIdentity } from '../lib/deviceSessionAuth.js';
import { authenticateRequest } from '../lib/requestAuth.js';
import {
  isAccessSitterSyncConfigured,
  readSitterEmailsFromAccess
} from '../lib/accessSitterPolicy.js';
import { validateEmailList } from '../lib/emailLists.js';
import {
  getSitterAccessEmailsRaw,
  setSitterAccessEmails,
  setSitterSecretsManual
} from '../lib/houseSettings.js';
import { applySitterStaySchedule, getEffectiveSitterAccessState } from '../lib/sitterSchedule.js';
import { listSitterStays, serializeSitterStayForApi } from '../lib/sitterStays.js';

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 */
export async function resolveSitterAccessEmails(env, fetchImpl = fetch) {
  const state = await getEffectiveSitterAccessState(env);
  if ((await getSitterAccessEmailsRaw(env)) !== null) {
    return state.effectiveEmails;
  }

  const bootstrapped = await readSitterEmailsFromAccess(env, fetchImpl);
  if (bootstrapped.length > 0 && env.HOUSE_GUIDE_DB) {
    await setSitterAccessEmails(env, bootstrapped);
  }
  const refreshed = await getEffectiveSitterAccessState(env);
  return refreshed.effectiveEmails;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 */
export async function resolveSitterAccessEmailsManual(env, fetchImpl = fetch) {
  const stored = await getSitterAccessEmailsRaw(env);
  if (stored !== null) return stored;

  const bootstrapped = await readSitterEmailsFromAccess(env, fetchImpl);
  if (bootstrapped.length > 0 && env.HOUSE_GUIDE_DB) {
    await setSitterAccessEmails(env, bootstrapped);
  }
  return bootstrapped;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} [fetchImpl]
 */
export async function buildHouseSettingsPayload(env) {
  const state = await getEffectiveSitterAccessState(env);
  const stays = await listSitterStays(env);

  return {
    sitterSecretsManual: state.manualSecrets,
    sitterSecretsDisclosed: state.effectiveSecrets,
    sitterAccessEmailsManual: state.manualEmails,
    sitterAccessEmails: state.effectiveEmails,
    sitterStays: stays.map(serializeSitterStayForApi),
    accessSitterSyncConfigured: isAccessSitterSyncConfigured(env)
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

  return Response.json(await buildHouseSettingsPayload(env, fetchImpl), {
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
    await setSitterSecretsManual(env, body.disclosed);
  } catch {
    return Response.json({ error: 'SETTINGS_UNAVAILABLE' }, { status: 503 });
  }

  return Response.json(await buildHouseSettingsPayload(env, fetchImpl), {
    headers: { 'Cache-Control': 'no-store' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleSitterAccessEmailsSetting(request, env, fetchImpl = fetch) {
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

  if (!Array.isArray(body?.emails)) {
    return Response.json({ error: 'Invalid request' }, { status: 400 });
  }

  const validationError = validateEmailList(body.emails);
  if (validationError) {
    return Response.json({ error: 'VALIDATION_ERROR', message: validationError }, { status: 400 });
  }

  const emails = body.emails.map((email) => String(email).trim().toLowerCase()).filter(Boolean);

  try {
    await setSitterAccessEmails(env, emails);
  } catch {
    return Response.json({ error: 'SETTINGS_UNAVAILABLE' }, { status: 503 });
  }

  const schedule = await applySitterStaySchedule(env, fetchImpl);
  const payload = await buildHouseSettingsPayload(env, fetchImpl);
  const syncResult = schedule.syncResult ?? { ok: false, code: 'ACCESS_SYNC_NOT_CONFIGURED' };

  if (!syncResult.ok) {
    return Response.json(
      {
        ...payload,
        accessSyncOk: false,
        accessSyncError: syncResult.code,
        accessSyncMessage: syncResult.message ?? null
      },
      { status: syncResult.code === 'ACCESS_SYNC_NOT_CONFIGURED' ? 200 : 502 }
    );
  }

  return Response.json(
    {
      ...payload,
      accessSyncOk: true
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}
