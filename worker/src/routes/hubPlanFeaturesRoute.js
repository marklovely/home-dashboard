import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';
import { fetchHubPlanStatus } from '../lib/hubPlanLimits.js';

/**
 * Plan feature flags for any signed-in hub session (owner or sitter).
 *
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleHubPlanFeatures(request, env, fetchImpl = fetch) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const plan = await fetchHubPlanStatus(env, request, fetchImpl);
  return Response.json(
    {
      plan: plan.plan,
      planLabel: plan.planLabel,
      features: plan.features,
      upgradeUrl: plan.upgradeUrl
    },
    {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    }
  );
}
