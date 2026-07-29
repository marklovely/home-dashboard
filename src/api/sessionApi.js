import { ensureApiBaseUrl, getApiBaseUrl } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchSession({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  const base = getApiBaseUrl();
  if (!base) {
    return { ok: false, status: 503, data: null };
  }

  try {
    const response = await fetchImpl(`${base}/api/session`, withApiCredentials({ cache: 'no-store' }));
    const data = await response.json();
    if (!response.ok) {
      return { ok: false, status: response.status, data };
    }
    return { ok: true, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}
