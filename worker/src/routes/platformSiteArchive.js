import { jsonError, methodNotAllowed } from '../lib/errors.js';
import { isPlatformSiteArchiveAuthorized } from '../lib/platformSiteArchiveAuth.js';
import { buildSiteBackupPayload } from '../lib/siteBackupPayload.js';

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handlePlatformSiteArchive(request, env, correlationId) {
  if (request.method !== 'GET') {
    return methodNotAllowed(correlationId);
  }

  if (!isPlatformSiteArchiveAuthorized(request, env)) {
    return jsonError(403, 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  const payload = await buildSiteBackupPayload(env, { scope: 'full' });
  return Response.json(
    {
      ...payload,
      archiveSource: 'platform-pre-deprovision',
      archivedAt: new Date().toISOString()
    },
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store'
      }
    }
  );
}
