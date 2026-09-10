import { requireOwnerIdentity } from '../lib/deviceSessionAuth.js';
import { fetchHubPlanStatus, planLimitExceeded } from '../lib/hubPlanLimits.js';
import { countHouseGuides, createHouseGuide, listHouseGuides, requireHouseGuidesDb } from '../houseGuide/houseGuides.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleHouseGuidesCollection(request, env, fetchImpl = fetch) {
  const db = requireHouseGuidesDb(env.HOUSE_GUIDE_DB);

  if (request.method === 'GET') {
    const guides = await listHouseGuides(db);
    return Response.json({ guides });
  }

  if (request.method === 'POST') {
    const ownerCheck = await requireOwnerIdentity(request, env, fetchImpl);
    if (!ownerCheck.ok) {
      return Response.json({ error: ownerCheck.code }, { status: ownerCheck.status });
    }

    const plan = await fetchHubPlanStatus(env, request, fetchImpl);
    const currentCount = await countHouseGuides(db);
    if (planLimitExceeded(plan, currentCount, 'guide')) {
      return Response.json(
        {
          error: 'PLAN_LIMIT',
          message: `Free plan includes up to ${plan.limits.maxGuides} house guides. Upgrade to Lovely Home+ for unlimited.`,
          upgradeUrl: plan.upgradeUrl
        },
        { status: 403 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    const result = await createHouseGuide(db, { title: body?.title, id: body?.id });
    if (!result.ok) {
      return Response.json({ error: result.code, message: result.message }, { status: 400 });
    }
    return Response.json({ guide: result.guide }, { status: 201 });
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
