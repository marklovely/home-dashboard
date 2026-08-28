import { requireOwnerIdentity } from '../lib/deviceSessionAuth.js';
import { authenticateRequest } from '../lib/requestAuth.js';
import { applySitterStaySchedule } from '../lib/sitterSchedule.js';
import {
  cancelSitterStay,
  createSitterStay,
  endSitterStayNow,
  extendSitterStay,
  getSitterStayById,
  serializeSitterStayForApi,
  updateSitterStay
} from '../lib/sitterStays.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleSitterStaysCollection(request, env, fetchImpl = fetch) {
  if (request.method === 'POST') {
    return handleSitterStayCreate(request, env, fetchImpl);
  }
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {URL} url
 * @param {typeof fetch} fetchImpl
 */
export async function handleSitterStayItem(request, env, url, fetchImpl = fetch) {
  const parts = url.pathname.split('/').filter(Boolean);
  const id = parts[parts.length - 1] === 'sitter-stays' ? null : parts[parts.length - 1];
  const action = parts.length >= 5 ? parts[parts.length - 1] : null;
  const stayId = action && ['cancel', 'extend', 'end-now'].includes(action) ? parts[parts.length - 2] : id;

  if (!stayId) {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  if (action === 'cancel' && request.method === 'POST') {
    return handleSitterStayCancel(request, env, stayId, fetchImpl);
  }
  if (action === 'extend' && request.method === 'POST') {
    return handleSitterStayExtend(request, env, stayId, fetchImpl);
  }
  if (action === 'end-now' && request.method === 'POST') {
    return handleSitterStayEndNow(request, env, stayId, fetchImpl);
  }
  if (request.method === 'PUT') {
    return handleSitterStayUpdate(request, env, stayId, fetchImpl);
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
async function handleSitterStayCreate(request, env, fetchImpl) {
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

  const result = await createSitterStay(env, body ?? {});
  if (!result.ok) {
    return Response.json({ error: result.code, message: result.message }, { status: 400 });
  }

  const schedule = await applySitterStaySchedule(env, fetchImpl);
  return Response.json(
    {
      stay: serializeSitterStayForApi(result.stay),
      scheduleApplied: schedule.ok,
      accessSyncOk: schedule.syncResult?.ok ?? false,
      accessSyncError: schedule.syncResult?.ok ? null : schedule.syncResult?.code ?? null,
      accessSyncMessage: schedule.syncResult?.message ?? null
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 * @param {typeof fetch} fetchImpl
 */
async function handleSitterStayUpdate(request, env, id, fetchImpl) {
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

  const result = await updateSitterStay(env, id, body ?? {});
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return Response.json({ error: result.code, message: result.message }, { status });
  }

  const schedule = await applySitterStaySchedule(env, fetchImpl);
  return Response.json(
    {
      stay: serializeSitterStayForApi(result.stay),
      scheduleApplied: schedule.ok,
      accessSyncOk: schedule.syncResult?.ok ?? false,
      accessSyncError: schedule.syncResult?.ok ? null : schedule.syncResult?.code ?? null,
      accessSyncMessage: schedule.syncResult?.message ?? null
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 * @param {typeof fetch} fetchImpl
 */
async function handleSitterStayCancel(request, env, id, fetchImpl) {
  const ownerCheck = await requireOwnerIdentity(request, env, fetchImpl);
  if (!ownerCheck.ok) {
    return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
  }

  const result = await cancelSitterStay(env, id);
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return Response.json({ error: result.code, message: result.message }, { status });
  }

  const schedule = await applySitterStaySchedule(env, fetchImpl);
  return Response.json(
    {
      stay: serializeSitterStayForApi(result.stay),
      scheduleApplied: schedule.ok,
      accessSyncOk: schedule.syncResult?.ok ?? false,
      accessSyncError: schedule.syncResult?.ok ? null : schedule.syncResult?.code ?? null,
      accessSyncMessage: schedule.syncResult?.message ?? null
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 * @param {typeof fetch} fetchImpl
 */
async function handleSitterStayExtend(request, env, id, fetchImpl) {
  const ownerCheck = await requireOwnerIdentity(request, env, fetchImpl);
  if (!ownerCheck.ok) {
    return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const result = await extendSitterStay(env, id, body ?? {});
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return Response.json({ error: result.code, message: result.message }, { status });
  }

  const schedule = await applySitterStaySchedule(env, fetchImpl);
  return Response.json(
    {
      stay: serializeSitterStayForApi(result.stay),
      scheduleApplied: schedule.ok,
      accessSyncOk: schedule.syncResult?.ok ?? false,
      accessSyncError: schedule.syncResult?.ok ? null : schedule.syncResult?.code ?? null,
      accessSyncMessage: schedule.syncResult?.message ?? null
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 * @param {typeof fetch} fetchImpl
 */
async function handleSitterStayEndNow(request, env, id, fetchImpl) {
  const ownerCheck = await requireOwnerIdentity(request, env, fetchImpl);
  if (!ownerCheck.ok) {
    return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
  }

  const result = await endSitterStayNow(env, id);
  if (!result.ok) {
    const status = result.code === 'NOT_FOUND' ? 404 : 400;
    return Response.json({ error: result.code, message: result.message }, { status });
  }

  const schedule = await applySitterStaySchedule(env, fetchImpl);
  return Response.json(
    {
      stay: serializeSitterStayForApi(result.stay),
      scheduleApplied: schedule.ok,
      accessSyncOk: schedule.syncResult?.ok ?? false,
      accessSyncError: schedule.syncResult?.ok ? null : schedule.syncResult?.code ?? null,
      accessSyncMessage: schedule.syncResult?.message ?? null
    },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {string} id
 */
export async function handleSitterStayGet(request, env, id) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const access = await authenticateRequest(request, env);
  if (!access.ok) {
    return Response.json({ error: access.code }, { status: access.status });
  }

  const stay = await getSitterStayById(env, id);
  if (!stay) {
    return Response.json({ error: 'NOT_FOUND' }, { status: 404 });
  }

  return Response.json({ stay: serializeSitterStayForApi(stay) }, { headers: { 'Cache-Control': 'no-store' } });
}
