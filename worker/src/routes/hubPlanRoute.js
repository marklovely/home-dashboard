import { requireOwnerIdentity } from '../lib/deviceSessionAuth.js';
import { fetchHubPlanStatus } from '../lib/hubPlanLimits.js';
import { countHouseGuides, requireHouseGuidesDb } from '../houseGuide/houseGuides.js';

/**
 * @param {Record<string, string | undefined>} env
 */
async function countActiveStays(env) {
  const db = env.HOUSE_GUIDE_DB;
  if (!db || typeof db.prepare !== 'function') return 0;
  const row = await db
    .prepare(`SELECT COUNT(*) AS n FROM sitter_stays WHERE status != 'cancelled'`)
    .first();
  return Number(row?.n ?? 0);
}

/**
 * Owner-only plan summary for hub UI (platform tier + local usage).
 *
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleHubPlanUsage(request, env, fetchImpl = fetch) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const ownerCheck = await requireOwnerIdentity(request, env, fetchImpl);
  if (!ownerCheck.ok) {
    return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
  }

  const db = requireHouseGuidesDb(env.HOUSE_GUIDE_DB);
  const plan = await fetchHubPlanStatus(env, request, fetchImpl);
  const guideCount = await countHouseGuides(db);
  const stayCount = await countActiveStays(env);

  return Response.json({
    plan: plan.plan,
    planLabel: plan.planLabel,
    limits: plan.limits,
    usage: { guides: guideCount, stays: stayCount },
    upgradeUrl: plan.upgradeUrl,
    accountUrl: plan.accountUrl
  });
}
