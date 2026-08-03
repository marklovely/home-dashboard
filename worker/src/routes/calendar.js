import { requireOwnerDeviceMode } from '../lib/deviceSessionAuth.js';
import { isCalendarFeedConfigured } from '../lib/calendarFeed.js';
import { isTestHubWorker } from '../lib/hubEnvironment.js';

/**
 * @param {Request} request
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 */
export async function handleCalendar(request, env, fetchImpl = fetch) {
  try {
    if (request.method !== 'GET') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    if (isTestHubWorker(env)) {
      return Response.json(
        {
          error: 'Calendar unavailable',
          code: 'CALENDAR_NOT_CONFIGURED',
          feedConfigured: false,
          message: 'Personal calendars are disabled on the test hub.'
        },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const gate = await requireOwnerDeviceMode(request, env);
    if (!gate.ok) {
      return Response.json({ error: 'Forbidden', code: gate.code }, { status: gate.status ?? 403 });
    }

    const { getHomeCalendar } = await import('../calendar/calendarService.js');
    const payload = await getHomeCalendar(env, fetchImpl);
    return Response.json(payload, {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    const feedConfigured = await isCalendarFeedConfigured(env);
    /** @type {Record<string, unknown>} */
    let body;
    if (error?.code === 'CALENDAR_NOT_CONFIGURED') {
      body = { error: 'Calendar unavailable', code: 'CALENDAR_NOT_CONFIGURED', feedConfigured: false };
    } else if (error?.code === 'CALENDAR_INVALID_URL') {
      body = { error: 'Calendar unavailable', code: 'CALENDAR_INVALID_URL', feedConfigured: true };
    } else {
      body = {
        error: 'Calendar temporarily unavailable',
        code: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
        feedConfigured
      };
      if (typeof error?.upstreamStatus === 'number') {
        body.upstreamStatus = error.upstreamStatus;
      }
      if (typeof error?.networkReason === 'string') {
        body.networkReason = error.networkReason;
      }
    }
    console.error(
      JSON.stringify({
        event: 'calendar_failed',
        code: body.code,
        feedConfigured: body.feedConfigured,
        upstreamStatus: body.upstreamStatus,
        networkReason: body.networkReason
      })
    );
    return Response.json(body, { status: 503 });
  }
}
