import { jsonError, methodNotAllowed } from '../lib/errors.js';
import { collectFreeDowngradeUsage } from '../lib/freePlanDowngradeUsage.js';
import { isPlatformSiteArchiveAuthorized } from '../lib/platformSiteArchiveAuth.js';

/**
 * @param {Request} request
 * @param {Record<string, unknown>} env
 * @param {string} correlationId
 */
export async function handlePlatformDowngradeEligibility(request, env, correlationId) {
  if (request.method !== 'GET') {
    return methodNotAllowed(correlationId);
  }

  if (!isPlatformSiteArchiveAuthorized(request, env)) {
    return jsonError(403, 'FORBIDDEN', 'Forbidden.', { correlationId });
  }

  try {
    const usage = await collectFreeDowngradeUsage(env);
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
        event: 'platform_downgrade_eligibility_failed',
        correlationId,
        detail: error instanceof Error ? error.message.slice(0, 200) : 'unknown'
      })
    );
    return jsonError(500, 'INTERNAL_ERROR', 'Could not read hub usage.', { correlationId });
  }
}
