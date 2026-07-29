import { verifyOwnerBearer } from '../lib/ownerToken.js';
import { getHomeCalendar } from '../calendar/calendarService.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleCalendar(request, env, fetchImpl = fetch) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const authorized = await verifyOwnerBearer(request.headers.get('Authorization'), env);
  if (!authorized) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await getHomeCalendar(env, fetchImpl);
    return Response.json(payload, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' }
    });
  } catch (error) {
    if (error?.code === 'CALENDAR_NOT_CONFIGURED') {
      return Response.json({ error: 'Calendar unavailable', code: 'CALENDAR_NOT_CONFIGURED' }, { status: 503 });
    }
    const body = {
      error: 'Calendar temporarily unavailable',
      code: typeof error?.code === 'string' ? error.code : 'UNKNOWN'
    };
    if (typeof error?.upstreamStatus === 'number') {
      body.upstreamStatus = error.upstreamStatus;
    }
    return Response.json(body, { status: 503 });
  }
}
