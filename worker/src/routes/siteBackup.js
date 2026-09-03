import { requireOwnerDeviceMode } from '../lib/deviceSessionAuth.js';
import { isHouseGuideSeeded, requireHouseGuideDb } from '../houseGuide/repository.js';
import { loadImportableGuideCatalog } from '../houseGuide/exportCatalog.js';
import { jsonError, methodNotAllowed } from '../lib/errors.js';
import {
  SITE_BACKUP_FORMAT_VERSION,
  SITE_BACKUP_FORMAT_VERSION_LEGACY,
  buildSiteBackupPayload,
  parseSiteBackupScope,
  restoreSiteBackupPayload
} from '../lib/siteBackupPayload.js';
import { buildSiteBackupZipBytes, restoreSiteBackupMediaFromZip } from '../lib/siteBackupArchive.js';

export { SITE_BACKUP_FORMAT_VERSION };

/**
 * @param {{ ok: boolean, status?: number, code?: string }} ownerGate
 * @param {string} correlationId
 */
function ownerGateJsonError(ownerGate, correlationId) {
  if (ownerGate.code === 'DEVICE_MODE_REQUIRED') {
    return jsonError(403, 'DEVICE_MODE_REQUIRED', 'Unlock owner mode on this tablet and try again.', {
      correlationId
    });
  }
  return jsonError(ownerGate.status ?? 403, ownerGate.code ?? 'FORBIDDEN', 'Forbidden.', { correlationId });
}

export { buildSiteBackupPayload, restoreSiteBackupPayload };

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
    return ownerGateJsonError(ownerGate, correlationId);
  }

  const url = new URL(request.url);
  const scope = parseSiteBackupScope(url.searchParams.get('scope'));
  const format = url.searchParams.get('format')?.trim().toLowerCase() ?? 'json';

  if (format === 'zip') {
    if (scope !== 'full') {
      return jsonError(400, 'BAD_REQUEST', 'Zip backup is only available for full site backups.', {
        correlationId
      });
    }
    const zipBytes = await buildSiteBackupZipBytes(env, { scope });
    return new Response(zipBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Cache-Control': 'no-store',
        'Content-Disposition': 'attachment; filename="lovely-home-hub-backup.zip"'
      }
    });
  }

  const payload = await buildSiteBackupPayload(env, { scope });
  const filename =
    scope === 'guide' ? 'lovely-home-guide-backup.json' : 'lovely-home-hub-backup.json';

  return Response.json(payload, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="${filename}"`
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
    return ownerGateJsonError(ownerGate, correlationId);
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
  if (
    formatVersion !== SITE_BACKUP_FORMAT_VERSION &&
    formatVersion !== SITE_BACKUP_FORMAT_VERSION_LEGACY
  ) {
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
export async function handleSiteBackupRestoreMedia(request, env, correlationId) {
  if (request.method !== 'POST') {
    return methodNotAllowed(correlationId);
  }

  const ownerGate = await requireOwnerDeviceMode(request, env);
  if (!ownerGate.ok) {
    return ownerGateJsonError(ownerGate, correlationId);
  }

  const zipBytes = new Uint8Array(await request.arrayBuffer());
  if (!zipBytes.byteLength) {
    return jsonError(400, 'BAD_REQUEST', 'Expected a backup zip body.', { correlationId });
  }

  try {
    const result = await restoreSiteBackupMediaFromZip(env, zipBytes);
    return Response.json(
      { ok: true, ...result },
      { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message.slice(0, 200) : 'unknown';
    return jsonError(400, 'BAD_REQUEST', `Could not restore backup media: ${detail}`, { correlationId });
  }
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
    return ownerGateJsonError(ownerGate, correlationId);
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
      backupScope: 'guide',
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
  if (url.pathname === '/api/site/restore-media') {
    return handleSiteBackupRestoreMedia(request, env, correlationId);
  }
  return jsonError(404, 'NOT_FOUND', 'Route not found.', { correlationId });
}
