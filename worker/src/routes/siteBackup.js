import { requireOwnerDeviceMode } from '../lib/deviceSessionAuth.js';
import { getSitterSecretsDisclosed, setSitterSecretsDisclosed } from '../lib/houseSettings.js';
import { importGuideCatalog, isHouseGuideSeeded, requireHouseGuideDb } from '../houseGuide/repository.js';
import { loadImportableGuideCatalog } from '../houseGuide/exportCatalog.js';
import { jsonError, methodNotAllowed } from '../lib/errors.js';

export const SITE_BACKUP_FORMAT_VERSION = 1;

/**
 * @param {Record<string, unknown>} env
 */
export async function buildSiteBackupPayload(env) {
  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const seeded = await isHouseGuideSeeded(db);
  const sitterSecretsDisclosed = await getSitterSecretsDisclosed(env);

  /** @type {{ seeded: boolean, catalog: object | null, uploadedMedia: { id: string, alt: string }[] }} */
  let guide = { seeded: false, catalog: null, uploadedMedia: [] };

  if (seeded) {
    const exported = await loadImportableGuideCatalog(db);
    guide = {
      seeded: true,
      catalog: exported?.catalog ?? null,
      uploadedMedia: exported?.uploadedMedia ?? []
    };
  }

  return {
    formatVersion: SITE_BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    siteSettings: {
      sitterSecretsDisclosed
    },
    guide
  };
}

/**
 * @param {Record<string, unknown>} env
 * @param {Record<string, unknown>} payload
 */
export async function restoreSiteBackupPayload(env, payload) {
  if (payload.siteSettings?.sitterSecretsDisclosed !== undefined) {
    await setSitterSecretsDisclosed(env, Boolean(payload.siteSettings.sitterSecretsDisclosed));
  }

  if (payload.guide?.catalog && Array.isArray(payload.guide.catalog.categories)) {
    const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
    await importGuideCatalog(db, payload.guide.catalog);
  }

  return buildSiteBackupPayload(env);
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleSiteBackupGet(request, env, correlationId) {
  if (request.method !== 'GET') {
    return methodNotAllowed(correlationId);
  }

  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const payload = await buildSiteBackupPayload(env);
  return Response.json(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Content-Disposition': 'attachment; filename="lovely-home-hub-backup.json"'
    }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleSiteBackupRestore(request, env, correlationId) {
  if (request.method !== 'POST') {
    return methodNotAllowed(correlationId);
  }

  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'BAD_REQUEST', 'Invalid JSON body.', { correlationId });
  }

  if (!body || typeof body !== 'object') {
    return jsonError(400, 'BAD_REQUEST', 'Expected a backup JSON object.', { correlationId });
  }

  const formatVersion = Number(body.formatVersion ?? SITE_BACKUP_FORMAT_VERSION);
  if (formatVersion !== SITE_BACKUP_FORMAT_VERSION) {
    return jsonError(400, 'BAD_REQUEST', `Unsupported backup format version ${formatVersion}.`, { correlationId });
  }

  if (body.guide?.catalog && !Array.isArray(body.guide.catalog.categories)) {
    return jsonError(400, 'BAD_REQUEST', 'guide.catalog.categories must be an array.', { correlationId });
  }

  const restored = await restoreSiteBackupPayload(env, body);
  return Response.json({ ok: true, backup: restored }, {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleGuideExportGet(request, env, correlationId) {
  if (request.method !== 'GET') {
    return methodNotAllowed(correlationId);
  }

  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const db = requireHouseGuideDb(env.HOUSE_GUIDE_DB);
  const seeded = await isHouseGuideSeeded(db);
  if (!seeded) {
    return jsonError(404, 'NOT_FOUND', 'House guide is not seeded yet.', { correlationId });
  }

  const exported = await loadImportableGuideCatalog(db);
  if (!exported?.catalog) {
    return jsonError(404, 'NOT_FOUND', 'House guide is not seeded yet.', { correlationId });
  }

  return Response.json(
    {
      formatVersion: SITE_BACKUP_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      catalog: exported.catalog,
      uploadedMedia: exported.uploadedMedia
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Content-Disposition': 'attachment; filename="house-guide-export.json"'
      }
    }
  );
}

/**
 * @param {Request} request
 * @param {URL} url
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handleSiteBackup(request, url, env, correlationId) {
  if (url.pathname === '/api/site/backup') {
    return handleSiteBackupGet(request, env, correlationId);
  }
  if (url.pathname === '/api/site/restore') {
    return handleSiteBackupRestore(request, env, correlationId);
  }
  return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
}
