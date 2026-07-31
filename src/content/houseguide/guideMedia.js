import catalog from './guide-catalog.json';
import { buildHouseGuideMediaUrl } from '../../api/houseGuideApi.js';
import { getActiveGuideCatalog, isGuideContentRemote } from '../../services/guideContentService.js';

/** @typedef {{ ok: true, mediaId: string, url: string, alt: string }} GuideMediaResolved */
/** @typedef {{ ok: false, mediaId: string, reason: string, expectedFilename?: string, availableMediaIds: string[] }} GuideMediaUnresolved */

const mediaModules = import.meta.glob('./media/*.{jpg,jpeg,png,webp}', {
  eager: true,
  query: '?url',
  import: 'default'
});

/** @type {Map<string, string>} filename -> bundled URL */
const urlByFileName = new Map();

/** @type {Map<string, string>} stem -> bundled URL */
const urlByStem = new Map();

for (const [modulePath, url] of Object.entries(mediaModules)) {
  const fileName = modulePath.split('/').pop() ?? '';
  if (!fileName || typeof url !== 'string') continue;
  urlByFileName.set(fileName, url);
  const stem = fileName.replace(/\.(jpe?g|png|webp)$/i, '');
  urlByStem.set(stem, url);
}

/** @type {Record<string, { file: string, alt: string, hasUpload?: boolean }>} */
function getCatalogMediaMap() {
  if (isGuideContentRemote()) {
    return getActiveGuideCatalog().media ?? {};
  }
  return catalog.media ?? {};
}

const catalogMedia = catalog.media ?? {};

/**
 * @returns {string[]}
 */
export function listBundledMediaStems() {
  return [...urlByStem.keys()].sort();
}

/**
 * @returns {string[]}
 */
export function listCatalogMediaIds() {
  return Object.keys(getCatalogMediaMap()).sort();
}

/**
 * @param {string} fileName
 * @returns {string | undefined}
 */
function resolveUrlForFileName(fileName) {
  if (urlByFileName.has(fileName)) return urlByFileName.get(fileName);
  const stem = fileName.replace(/\.(jpe?g|png|webp)$/i, '');
  return urlByStem.get(stem);
}

/**
 * Resolve a stable catalog media ID to a Vite-bundled asset URL.
 * @param {string} mediaId
 * @returns {GuideMediaResolved | GuideMediaUnresolved}
 */
export function resolveGuideMedia(mediaId) {
  const availableMediaIds = listCatalogMediaIds();
  const mediaMap = getCatalogMediaMap();
  const asset = mediaMap[mediaId] ?? catalogMedia[mediaId];

  if (!asset) {
    return {
      ok: false,
      mediaId,
      reason: 'unknown-media-id',
      availableMediaIds
    };
  }

  if (!asset.alt?.trim()) {
    return {
      ok: false,
      mediaId,
      reason: 'missing-alt-text',
      expectedFilename: asset.file,
      availableMediaIds
    };
  }

  if (asset.hasUpload) {
    return {
      ok: true,
      mediaId,
      url: buildHouseGuideMediaUrl(mediaId),
      alt: asset.alt
    };
  }

  const url = resolveUrlForFileName(asset.file);
  if (!url) {
    const unresolved = {
      ok: false,
      mediaId,
      reason: 'missing-bundled-file',
      expectedFilename: asset.file,
      availableMediaIds
    };
    if (import.meta.env.DEV) {
      console.warn(
        `[House Guide media] Could not resolve "${mediaId}" (expected file "${asset.file}"). Bundled stems: ${listBundledMediaStems().join(', ')}`
      );
    }
    return unresolved;
  }

  return {
    ok: true,
    mediaId,
    url,
    alt: asset.alt
  };
}

/** @deprecated Use resolveGuideMedia */
export function resolveGuideMediaUrl(fileName) {
  return resolveUrlForFileName(fileName);
}

/** @deprecated Use resolveGuideMedia */
export function resolveGuideMediaById(mediaId, mediaCatalog = catalogMedia) {
  const asset = mediaCatalog[mediaId];
  if (!asset) return undefined;
  const url = resolveUrlForFileName(asset.file);
  if (!url) return undefined;
  return { url, alt: asset.alt };
}

export function getGuideMediaCatalogFromModule() {
  return getCatalogMediaMap();
}
