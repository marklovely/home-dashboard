import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @param {Response} response
 */
async function readErrorBody(response) {
  try {
    const body = await response.json();
    const code =
      typeof body?.error?.code === 'string'
        ? body.error.code
        : typeof body?.code === 'string'
          ? body.code
          : '';
    const message =
      typeof body?.error?.message === 'string'
        ? body.error.message
        : typeof body?.message === 'string'
          ? body.message
          : typeof body?.error === 'string'
            ? body.error
            : 'Request failed';
    return { code, message };
  } catch {
    return { code: '', message: 'Request failed' };
  }
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchSiteProfile({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Site profile is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/profile'),
      withApiCredentials({ headers: { Accept: 'application/json' }, cache: 'no-store' })
    );
    if (!response.ok) {
      const { code, message } = await readErrorBody(response);
      return { ok: false, status: response.status, code, message, data: null };
    }
    return { ok: true, status: 200, code: '', message: '', data: await response.json() };
  } catch {
    return { ok: false, status: 503, code: 'NETWORK_ERROR', message: 'Site profile is temporarily unavailable.', data: null };
  }
}

/**
 * @param {Record<string, unknown>} patch
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function patchSiteProfile(patch, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Could not save site profile.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/profile'),
      withApiCredentials({
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
        cache: 'no-store'
      })
    );
    if (!response.ok) {
      const { code, message } = await readErrorBody(response);
      return { ok: false, status: response.status, code, message, data: null };
    }
    return { ok: true, status: 200, code: '', message: '', data: await response.json() };
  } catch {
    return { ok: false, status: 503, code: 'NETWORK_ERROR', message: 'Could not save site profile.', data: null };
  }
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchHubSecretsStatus({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Secrets status is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/secrets/status'),
      withApiCredentials({ headers: { Accept: 'application/json' }, cache: 'no-store' })
    );
    if (!response.ok) {
      const { code, message } = await readErrorBody(response);
      return { ok: false, status: response.status, code, message, data: null };
    }
    return { ok: true, status: 200, code: '', message: '', data: await response.json() };
  } catch {
    return { ok: false, status: 503, code: 'NETWORK_ERROR', message: 'Secrets status is temporarily unavailable.', data: null };
  }
}

/**
 * @param {Record<string, string>} patch
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function patchHubSecrets(patch, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Could not save secrets.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/secrets'),
      withApiCredentials({
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
        cache: 'no-store'
      })
    );
    if (!response.ok) {
      const { code, message } = await readErrorBody(response);
      return { ok: false, status: response.status, code, message, data: null };
    }
    return { ok: true, status: 200, code: '', message: '', data: await response.json() };
  } catch {
    return { ok: false, status: 503, code: 'NETWORK_ERROR', message: 'Could not save secrets.', data: null };
  }
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function resetHubSite({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Reset is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/site/reset'),
      withApiCredentials({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET' }),
        cache: 'no-store'
      })
    );
    if (!response.ok) {
      const { code, message } = await readErrorBody(response);
      return { ok: false, status: response.status, code, message, data: null };
    }
    return { ok: true, status: 200, code: '', message: '', data: await response.json() };
  } catch {
    return { ok: false, status: 503, code: 'NETWORK_ERROR', message: 'Reset is temporarily unavailable.', data: null };
  }
}
