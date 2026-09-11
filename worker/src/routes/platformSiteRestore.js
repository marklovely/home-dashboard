import { jsonError, methodNotAllowed } from '../lib/errors.js';
import { isPlatformSiteArchiveAuthorized } from '../lib/platformSiteArchiveAuth.js';
import {
  SITE_BACKUP_FORMAT_VERSION,
  SITE_BACKUP_FORMAT_VERSION_LEGACY,
  restoreSiteBackupPayload
} from '../lib/siteBackupPayload.js';

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handlePlatformSiteRestore(request, env, correlationId) {
  if (request.method !== 'POST') {
    return methodNotAllowed(correlationId);
  }

  if (!isPlatformSiteArchiveAuthorized(request, env)) {
    return jsonError(403, 'FORBIDDEN', 'Forbidden.', { correlationId });
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
    return jsonError(400, 'BAD_REQUEST', `Unsupported backup format version ${formatVersion}.`, {
      correlationId
    });
  }

  if (body.guide?.catalog && !Array.isArray(body.guide.catalog.categories)) {
    return jsonError(400, 'BAD_REQUEST', 'guide.catalog.categories must be an array.', {
      correlationId
    });
  }

  try {
    const restored = await restoreSiteBackupPayload(env, body);
    return Response.json(
      {
        ok: true,
        backup: restored,
        restoreSource: 'platform-post-provision'
      },
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      }
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'platform_site_restore_failed',
        correlationId,
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
    return jsonError(500, 'INTERNAL_ERROR', 'Site archive restore failed.', { correlationId });
  }
}
