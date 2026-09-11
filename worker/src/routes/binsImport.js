import { requireAnyDeviceSession } from '../lib/deviceSessionAuth.js';
import { fetchHubPlanStatus, planFeatureBlockedMessage } from '../lib/hubPlanLimits.js';
import { resolveUprnFromAddress } from '../bins/osPlacesUprn.js';
import { resolveOsPlacesConfig } from '../lib/osPlaces.js';
import { parseBinDatesWithAi } from '../bins/parseDatesAi.js';
import { fetchUkBinDaySchedule, isUsableUkBinDayCouncilId } from '../bins/ukBinDayImport.js';
import { fetchUkBinDayCouncil } from '../bins/ukBinDay.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleBinsImportSchedule(request, env, fetchImpl = fetch) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const plan = await fetchHubPlanStatus(env, request, fetchImpl);
  const blocked = planFeatureBlockedMessage(plan, 'bins');
  if (blocked) {
    return Response.json(blocked, { status: 403 });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const postcode = String(body?.postcode ?? '').trim();
  const councilId = String(body?.councilId ?? '').trim();
  let uprn = String(body?.uprn ?? '').trim();
  const line1 = String(body?.line1 ?? '').trim();
  const line2 = String(body?.line2 ?? '').trim();
  const city = String(body?.city ?? '').trim();
  const address = String(body?.address ?? '').trim();

  if (!postcode) {
    return Response.json({ error: 'Postcode is required.' }, { status: 400 });
  }

  let resolvedCouncilId = councilId;
  if (!resolvedCouncilId) {
    const council = await fetchUkBinDayCouncil(postcode, fetchImpl);
    if (council.ok && council.supported && council.councilId) {
      resolvedCouncilId = council.councilId;
    }
  }

  if (!resolvedCouncilId || !isUsableUkBinDayCouncilId(resolvedCouncilId)) {
    return Response.json(
      {
        error: 'Automatic import is not available for this council — try PDF upload or paste.',
        code: 'COUNCIL_NOT_SUPPORTED'
      },
      { status: 422 }
    );
  }

  if (!uprn) {
    const uprnResult = await resolveUprnFromAddress(
      { postcode, line1, line2, city },
      resolveOsPlacesConfig(env).apiKey,
      fetchImpl
    );
    if (!uprnResult.ok) {
      return Response.json(
        {
          error: uprnResult.error,
          code: uprnResult.code ?? 'UPRN_REQUIRED'
        },
        { status: 422 }
      );
    }
    uprn = uprnResult.uprn;
  }

  const formattedAddress =
    address ||
    [line1, line2, city, postcode]
      .filter(Boolean)
      .join(', ');

  const result = await fetchUkBinDaySchedule(
    {
      uprn,
      councilId: resolvedCouncilId,
      postcode,
      address: formattedAddress
    },
    fetchImpl
  );

  if (!result.ok) {
    return Response.json({ error: result.error, code: 'IMPORT_FAILED' }, { status: result.status ?? 503 });
  }

  return Response.json(
    {
      source: 'ukbinday',
      uprn,
      councilId: resolvedCouncilId,
      cached: result.cached,
      count: result.count,
      household: result.household,
      gardenWaste: result.gardenWaste
    },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 */
export async function handleBinsParseDates(request, env) {
  const gate = await requireAnyDeviceSession(request, env);
  if (!gate.ok) {
    return Response.json({ error: gate.code }, { status: gate.status });
  }

  const plan = await fetchHubPlanStatus(env, request);
  const blocked = planFeatureBlockedMessage(plan, 'bins');
  if (blocked) {
    return Response.json(blocked, { status: 403 });
  }

  if (request.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const text = String(body?.text ?? '').trim();
  const result = await parseBinDatesWithAi(env, text);
  if (!result.ok) {
    return Response.json({ error: result.error, code: result.code }, { status: result.status ?? 503 });
  }

  return Response.json(
    { entries: result.entries },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
