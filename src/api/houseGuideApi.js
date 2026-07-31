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
  } catch {
    /* ignore */
  }
  return 'Request failed';
}

/**
 * @param {{ fetchImpl?: typeof fetch, draft?: boolean }} [options]
 */
export async function fetchHouseGuideCatalog({ fetchImpl = fetch, draft = false } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'House guide is temporarily unavailable.', data: null };
  }

  try {
    const url = draft ? '/api/house-guide/catalog?draft=1' : '/api/house-guide/catalog';
    const response = await fetchImpl(
      buildApiUrl(url),
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
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'House guide is temporarily unavailable.', data: null };
  }
}

/**
 * @param {import('../types/guideContent.js').GuideCatalog} catalog
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function importHouseGuideCatalog(catalog, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'House guide is temporarily unavailable.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-guide/import'),
      withApiCredentials({
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ catalog })
      })
    );

    if (!response.ok) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: response.status, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'House guide is temporarily unavailable.', data: null };
  }
}

/**
 * @param {string} topicId
 * @param {Record<string, unknown>} patch
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function patchHouseGuideTopic(topicId, patch, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Could not save topic.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/house-guide/topics/${encodeURIComponent(topicId)}`),
      withApiCredentials({
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      })
    );

    if (!response.ok) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Could not save topic.', data: null };
  }
}

/**
 * @param {string} topicId
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function publishHouseGuideTopic(topicId, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Could not publish topic.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl(`/api/house-guide/topics/${encodeURIComponent(topicId)}/publish`),
      withApiCredentials({
        method: 'POST',
        headers: { Accept: 'application/json' }
      })
    );

    if (!response.ok) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Could not publish topic.', data: null };
  }
}

/**
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function publishAllHouseGuideTopics({ fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Could not publish changes.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-guide/publish-all'),
      withApiCredentials({
        method: 'POST',
        headers: { Accept: 'application/json' }
      })
    );

    if (!response.ok) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Could not publish changes.', data: null };
  }
}

/**
 * @param {{ homeSummaryTitle?: string, homeSummarySubtitle?: string }} patch
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function patchHouseGuideSettings(patch, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Could not save guide settings.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-guide/settings'),
      withApiCredentials({
        method: 'PATCH',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      })
    );

    if (!response.ok) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: 200, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Could not save guide settings.', data: null };
  }
}

/**
 * @param {string} mediaId
 */
export function buildHouseGuideMediaUrl(mediaId) {
  return buildApiUrl(`/api/house-guide/media/${encodeURIComponent(mediaId)}/file`);
}

/**
 * @param {FormData} formData
 * @param {{ fetchImpl?: typeof fetch }} [options]
 */
export async function uploadHouseGuideMedia(formData, { fetchImpl = fetch } = {}) {
  await ensureApiBaseUrl();
  if (!isApiConfigured()) {
    return { ok: false, status: 503, message: 'Could not upload image.', data: null };
  }

  try {
    const response = await fetchImpl(
      buildApiUrl('/api/house-guide/media'),
      withApiCredentials({
        method: 'POST',
        body: formData
      })
    );

    if (!response.ok) {
      return { ok: false, status: response.status, message: await readErrorMessage(response), data: null };
    }

    const data = await response.json();
    return { ok: true, status: response.status, message: '', data };
  } catch {
    return { ok: false, status: 503, message: 'Could not upload image.', data: null };
  }
}
