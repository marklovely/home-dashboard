import { ensureApiBaseUrl, getApiBaseUrl } from './apiBase.js';
import { getOwnerAccessToken } from '../auth/ownerAccessToken.js';

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchMyDayCalendar({ fetchImpl = fetch } = {}) {
  const token = getOwnerAccessToken();
  if (!token) {
    return { ok: false, status: 401, message: 'Owner authorization required', data: null };
  }

  await ensureApiBaseUrl();
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 503, message: 'API not configured', data: null };
  }

  try {
    const response = await fetchImpl(`${base}/api/calendar`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`
      },
      cache: 'no-store'
    });

    if (response.status === 401) {
      return { ok: false, status: 401, message: 'Owner authorization required', data: null };
    }
    if (!response.ok) {
      let code = 'Calendar unavailable';
      try {
        const errBody = await response.json();
        if (typeof errBody?.code === 'string') code = errBody.code;
        if (errBody?.feedConfigured === false) code = 'CALENDAR_NOT_CONFIGURED';
        if (typeof errBody?.upstreamStatus === 'number') {
          code = `${code}:${errBody.upstreamStatus}`;
        }
      } catch {
        /* ignore */
      }
      return { ok: false, status: response.status, message: code, data: null };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Calendar unavailable', data: null };
  }
}
