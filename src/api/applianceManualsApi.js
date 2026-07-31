import { ensureApiBaseUrl, buildApiUrl, isApiConfigured } from './apiBase.js';
import { withApiCredentials } from './accessFetch.js';

/**
 * @typedef {Object} ApplianceManual
 * @property {string} id
 * @property {string} title
 * @property {string} applianceName
 * @property {string | null} manufacturer
 * @property {string | null} model
 * @property {string} category
 * @property {string | null} location
 * @property {string | null} description
 * @property {string} originalFilename
 * @property {string} mimeType
 * @property {number} fileSize
 * @property {boolean} published
 * @property {number} sortOrder
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @param {Response} response
 */
async function readErrorMessage(response) {
  try {
    const body = await response.json();
    if (typeof body?.error?.message === 'string') return body.error.message;
    if (typeof body?.error === 'string') return body.error;
    if (typeof body?.message === 'string') return body.message;
  } catch {
    /* ignore */
  }
  return 'Request failed';
}

/**
 * @param {{ fetchImpl?: typeof fetch, publishedOnly?: boolean }} [options]
 */
export async function fetchApplianceManuals({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/appliance-manuals'),
      withApiCredentials({
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
    );

    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, message: 'Forbidden.', data: null };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: await readErrorMessage(response),
        data: null
      };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data: /** @type {{ manuals: ApplianceManual[] }} */ (data) };
  } catch {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }
}

/**
 * @param {string} id
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchApplianceManual(id, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/appliance-manuals/${encodeURIComponent(id)}`),
      withApiCredentials({
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
    );

    if (response.status === 404) {
      return { ok: false, status: 404, message: 'Manual not found.', data: null };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, message: 'Forbidden.', data: null };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: await readErrorMessage(response),
        data: null
      };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data: /** @type {ApplianceManual} */ (data) };
  } catch {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }
}

/**
 * @param {FormData} formData
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function createApplianceManual(formData, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/appliance-manuals'),
      withApiCredentials({ method: 'POST', body: formData })
    );

    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, message: 'Forbidden.', data: null };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: await readErrorMessage(response),
        data: null
      };
    }

    const data = await response.json();
    return { ok: true, status: 201, message: '', data: /** @type {ApplianceManual} */ (data) };
  } catch {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }
}

/**
 * @param {string} id
 * @param {Record<string, unknown>} patch
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function patchApplianceManual(id, patch, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/appliance-manuals/${encodeURIComponent(id)}`),
      withApiCredentials({
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      })
    );

    if (response.status === 404) {
      return { ok: false, status: 404, message: 'Manual not found.', data: null };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, message: 'Forbidden.', data: null };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: await readErrorMessage(response),
        data: null
      };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data: /** @type {ApplianceManual} */ (data) };
  } catch {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }
}

/**
 * @param {string} id
 * @param {FormData} formData
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function replaceApplianceManualFile(id, formData, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/appliance-manuals/${encodeURIComponent(id)}/file`),
      withApiCredentials({ method: 'PUT', body: formData })
    );

    if (response.status === 404) {
      return { ok: false, status: 404, message: 'Manual not found.', data: null };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, message: 'Forbidden.', data: null };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: await readErrorMessage(response),
        data: null
      };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data: /** @type {ApplianceManual} */ (data) };
  } catch {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }
}

/**
 * @param {string} id
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function deleteApplianceManual(id, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/appliance-manuals/${encodeURIComponent(id)}`),
      withApiCredentials({ method: 'DELETE' })
    );

    if (response.status === 404) {
      return { ok: false, status: 404, message: 'Manual not found.', data: null };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: response.status, message: 'Forbidden.', data: null };
    }
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        message: await readErrorMessage(response),
        data: null
      };
    }

    return { ok: true, status: 204, message: '', data: null };
  } catch {
    return { ok: false, status: 503, message: 'Appliance manuals are temporarily unavailable.', data: null };
  }
}

/**
 * @param {string} id
 */
export function buildApplianceManualFileUrl(id) {
  return buildApiUrl(`/api/appliance-manuals/${encodeURIComponent(id)}/file`);
}

/**
 * @param {string} id
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function fetchApplianceManualPdfBlob(id, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  const response = await fetchImpl(
    buildApplianceManualFileUrl(id),
    withApiCredentials({
      headers: { Accept: 'application/pdf' },
      cache: 'no-store'
    })
  );

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: response.status === 403 ? 'Forbidden.' : 'Manual not found.',
      blob: null
    };
  }

  const blob = await response.blob();
  return { ok: true, status: 200, message: '', blob };
}
