import {
  createHouseGuideTopic,
  deleteHouseGuideMedia,
  deleteHouseGuideTopic,
  fetchHouseGuideCatalog,
  fetchHouseGuideMediaLibrary,
  importHouseGuideCatalog,
  patchHouseGuideSettings,
  patchHouseGuideTopic,
  publishAllHouseGuideTopics,
  publishHouseGuideTopic,
  reorderHouseGuideTopics
} from '../api/houseGuideApi.js';
import { getJsonCatalog } from '../content/houseguide/providers/jsonGuideProvider.js';
import { getDeviceSessionStatus } from '../auth/deviceSessionStore.js';
import { isOwnerUserMode } from '../auth/userMode.js';
import { cacheGuideCatalogForOffline } from './guideOfflineCache.js';

/** @typedef {'idle' | 'loading' | 'json' | 'remote' | 'unavailable'} GuideContentSource */

/** @typedef {{
 *   source: GuideContentSource,
 *   seeded: boolean,
 *   draftCount: number,
 *   catalog: import('../types/guideContent.js').GuideCatalog | null,
 *   message: string
 * }} GuideContentState */

/** @type {GuideContentState} */
let state = {
  source: 'idle',
  seeded: false,
  draftCount: 0,
  catalog: null,
  message: ''
};

/** @type {Set<(state: GuideContentState) => void>} */
const listeners = new Set();

/** @type {AbortController | null} */
let inFlightAbort = null;

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export function getGuideContentState() {
  return state;
}

/**
 * @param {(state: GuideContentState) => void} listener
 */
export function subscribeToGuideContent(listener) {
  listeners.add(listener);
  listener(state);
  return () => listeners.delete(listener);
}

/**
 * @returns {import('../types/guideContent.js').GuideCatalog}
 */
export function getActiveGuideCatalog() {
  if (state.catalog) return state.catalog;
  return getJsonCatalog();
}

export function isGuideContentRemote() {
  return state.source === 'remote';
}

export function canManageHouseGuideContent() {
  return isOwnerUserMode() && getDeviceSessionStatus() === 'ready';
}

/**
 * @param {typeof fetch} [fetchImpl]
 * @param {{ draft?: boolean, force?: boolean, silent?: boolean }} [options]
 */
export async function refreshGuideContent(fetchImpl = fetch, options = {}) {
  const draft = options.draft ?? canManageHouseGuideContent();

  if (getDeviceSessionStatus() !== 'ready') {
    state = {
      source: 'json',
      seeded: false,
      draftCount: 0,
      catalog: getJsonCatalog(),
      message: ''
    };
    notify();
    return state;
  }

  if (inFlightAbort && !options.force) {
    inFlightAbort.abort();
  }
  inFlightAbort = new AbortController();
  const signal = inFlightAbort.signal;

  if (!options.silent) {
    state = { ...state, source: 'loading', message: '' };
    notify();
  }

  const result = await fetchHouseGuideCatalog({
    fetchImpl: (url, init) => fetchImpl(url, { ...init, signal }),
    draft
  });

  if (signal.aborted) return state;

  if (!result.ok) {
    state = {
      source: result.status >= 500 ? 'unavailable' : 'json',
      seeded: false,
      draftCount: 0,
      catalog: getJsonCatalog(),
      message: result.status >= 500 ? result.message : ''
    };
    notify();
    return state;
  }

  const payload = result.data;
  if (!payload?.seeded || !payload.catalog) {
    state = {
      source: 'json',
      seeded: false,
      draftCount: 0,
      catalog: getJsonCatalog(),
      message: ''
    };
    notify();
    return state;
  }

  state = {
    source: 'remote',
    seeded: true,
    draftCount: payload.draftCount ?? 0,
    catalog: normalizeRemoteCatalog(payload.catalog),
    message: ''
  };
  if (!draft) {
    cacheGuideCatalogForOffline(state.catalog);
  }
  notify();
  return state;
}

/**
 * @param {import('../types/guideContent.js').GuideCatalog} remoteCatalog
 */
function normalizeRemoteCatalog(remoteCatalog) {
  /** @type {Record<string, { file: string, alt: string, hasUpload?: boolean }>} */
  const media = {};
  for (const [mediaId, asset] of Object.entries(remoteCatalog.media ?? {})) {
    media[mediaId] = {
      file: asset.file ?? `${mediaId}.jpg`,
      alt: asset.alt,
      hasUpload: Boolean(asset.hasUpload)
    };
  }

  return {
    version: remoteCatalog.version ?? 2,
    homeSummaryTitle: remoteCatalog.homeSummaryTitle,
    homeSummarySubtitle: remoteCatalog.homeSummarySubtitle,
    media,
    categories: remoteCatalog.categories ?? []
  };
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function importBundledGuideToCloud(fetchImpl = fetch) {
  const catalog = getJsonCatalog();
  const result = await importHouseGuideCatalog(catalog, { fetchImpl });
  if (!result.ok) return result;
  await refreshGuideContent(fetchImpl, { draft: true, force: true });
  return { ok: true, message: 'Guide copied to cloud.' };
}

/**
 * @param {string} topicId
 * @param {Record<string, unknown>} patch
 * @param {typeof fetch} [fetchImpl]
 */
export async function saveHouseGuideTopic(topicId, patch, fetchImpl = fetch) {
  const result = await patchHouseGuideTopic(topicId, patch, { fetchImpl });
  if (result.ok) {
    await refreshGuideContent(fetchImpl, { draft: true, force: true });
  }
  return result;
}

/**
 * @param {string} topicId
 * @param {typeof fetch} [fetchImpl]
 */
export async function publishHouseGuideTopicContent(topicId, fetchImpl = fetch) {
  const result = await publishHouseGuideTopic(topicId, { fetchImpl });
  if (result.ok) {
    await refreshGuideContent(fetchImpl, { draft: true, force: true });
  }
  return result;
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function publishAllHouseGuideChanges(fetchImpl = fetch) {
  const result = await publishAllHouseGuideTopics({ fetchImpl });
  if (result.ok) {
    await refreshGuideContent(fetchImpl, { draft: true, force: true });
  }
  return result;
}

/**
 * @param {{ homeSummaryTitle?: string, homeSummarySubtitle?: string }} patch
 * @param {typeof fetch} [fetchImpl]
 */
export async function saveHouseGuideSettings(patch, fetchImpl = fetch) {
  const result = await patchHouseGuideSettings(patch, { fetchImpl });
  if (result.ok) {
    await refreshGuideContent(fetchImpl, { draft: true, force: true });
  }
  return result;
}

/**
 * @param {Record<string, unknown>} input
 * @param {typeof fetch} [fetchImpl]
 */
export async function createNewHouseGuideTopic(input, fetchImpl = fetch) {
  const result = await createHouseGuideTopic(input, { fetchImpl });
  if (result.ok) {
    await refreshGuideContent(fetchImpl, { draft: true, force: true });
  }
  return result;
}

/**
 * @param {string} topicId
 * @param {typeof fetch} [fetchImpl]
 */
export async function removeHouseGuideTopic(topicId, fetchImpl = fetch) {
  const result = await deleteHouseGuideTopic(topicId, { fetchImpl });
  if (result.ok) {
    await refreshGuideContent(fetchImpl, { draft: true, force: true });
  }
  return result;
}

/**
 * @param {string} categoryId
 * @param {string[]} topicIds
 * @param {typeof fetch} [fetchImpl]
 */
export async function reorderHouseGuideTopicsInCategory(categoryId, topicIds, fetchImpl = fetch) {
  const result = await reorderHouseGuideTopics(categoryId, topicIds, { fetchImpl });
  if (result.ok) {
    await refreshGuideContent(fetchImpl, { draft: true, force: true, silent: true });
  }
  return result;
}

/**
 * @param {string} mediaId
 * @param {string} alt
 * @param {string} [fileName]
 */
export function registerGuideMediaUpload(mediaId, alt, fileName) {
  if (!state.catalog) return;
  const media = { ...state.catalog.media };
  media[mediaId] = {
    file: fileName ?? `${mediaId}.jpg`,
    alt,
    hasUpload: true
  };
  state = { ...state, catalog: { ...state.catalog, media } };
  notify();
}

/**
 * @param {typeof fetch} [fetchImpl]
 */
export async function loadHouseGuideMediaLibrary(fetchImpl = fetch) {
  return fetchHouseGuideMediaLibrary({ fetchImpl });
}

/**
 * @param {string} mediaId
 * @param {typeof fetch} [fetchImpl]
 */
export async function removeHouseGuideMediaItem(mediaId, fetchImpl = fetch) {
  const result = await deleteHouseGuideMedia(mediaId, { fetchImpl });
  if (result.ok) {
    await refreshGuideContent(fetchImpl, { draft: true, force: true });
  }
  return result;
}

export function clearGuideContentState() {
  inFlightAbort?.abort();
  inFlightAbort = null;
  state = {
    source: 'idle',
    seeded: false,
    draftCount: 0,
    catalog: null,
    message: ''
  };
  notify();
}

/** @internal */
export function resetGuideContentStateForTests() {
  clearGuideContentState();
}
