import { jsonError, methodNotAllowed } from '../lib/errors.js';
import { isPlatformSiteArchiveAuthorized } from '../lib/platformSiteArchiveAuth.js';
import { getThirdPartyApiUsage } from '../lib/thirdPartyApiUsage.js';

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handlePlatformThirdPartyUsage(request, env, correlationId) {
  if (request.method !== 'GET') {
    return methodNotAllowed(correlationId);
  }

  if (!isPlatformSiteArchiveAuthorized(request, env)) {
    return jsonError(403, 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  try {
    const usage = await getThirdPartyApiUsage(env);
    return Response.json(
      { usage },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error(
      JSON.stringify({
        event: 'platform_third_party_usage_failed',
        correlationId,
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
    return jsonError(500, 'INTERNAL_ERROR', 'Could not read hub API usage.', { correlationId });
  }
}
