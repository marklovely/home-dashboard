import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @param {Response} response
 */
async function readErrorMessage(response) {
  try {
    const body = await response.json();
    if (typeof body?.error?.message === 'string') return body.error.message;
    if (typeof body?.message === 'string') return body.message;
    if (typeof body?.error === 'string') return body.error;
  } catch {
    /* ignore */
  }
  return 'Request failed';
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchSiteBackup({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Backup is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/backup'),
      withApiCredentials({
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
    );

    if (!response.ok) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Backup is temporarily unavailable.', data: null };
  }
}

/**
 * @param {Record<string, unknown>} backup
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function restoreSiteBackup(backup, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Restore is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/restore'),
      withApiCredentials({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(backup),
        cache: 'no-store'
      })
    );

    if (!response.ok) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Restore is temporarily unavailable.', data: null };
  }
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchHouseGuideExport({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Export is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-guide/export'),
      withApiCredentials({
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
    );

    if (!response.ok) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Export is temporarily unavailable.', data: null };
  }
}
