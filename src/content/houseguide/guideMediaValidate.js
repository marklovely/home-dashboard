import catalog from './guide-catalog.json';
import {
  listBundledMediaStems,
  listCatalogMediaIds,
  resolveGuideMedia
} from './guideMedia.js';

/**
 * @typedef {Object} GuideMediaValidationIssue
 * @property {'unknown-media-id' | 'missing-bundled-file' | 'missing-alt' | 'duplicate-media-id' | 'orphan-file' | 'unreferenced-file'} code
 * @property {string} message
 * @property {string} [mediaId]
 * @property {string} [fileName]
 */

/**
 * Collect every mediaId referenced by hero/gallery blocks in the catalog.
 * @returns {Set<string>}
 */
export function collectReferencedMediaIds() {
  /** @type {Set<string>} */
  const referenced = new Set();
  for (const category of catalog.categories ?? []) {
    for (const topic of category.topics ?? []) {
      for (const block of topic.blocks ?? []) {
        if (block.type === 'heroImage' && block.mediaId) referenced.add(block.mediaId);
        if (block.type === 'gallery') {
          for (const id of block.mediaIds ?? []) referenced.add(id);
        }
      }
    }
  }
  return referenced;
}

/**
 * @returns {{ ok: boolean, issues: GuideMediaValidationIssue[] }}
 */
export function validateGuideMediaCatalog() {
  /** @type {GuideMediaValidationIssue[]} */
  const issues = [];
  const media = catalog.media ?? {};
  const ids = Object.keys(media);
  const seenFiles = new Map();

  for (const mediaId of ids) {
    const entry = media[mediaId];
    if (!entry.alt?.trim()) {
      issues.push({
        code: 'missing-alt',
        mediaId,
        message: `Media "${mediaId}" is missing alt text`
      });
    }

    const resolved = resolveGuideMedia(mediaId);
    if (!resolved.ok) {
      issues.push({
        code: resolved.reason === 'unknown-media-id' ? 'unknown-media-id' : 'missing-bundled-file',
        mediaId,
        fileName: entry.file,
        message: `Media "${mediaId}" could not be resolved (${resolved.reason})`
      });
    }

    if (seenFiles.has(entry.file)) {
      issues.push({
        code: 'duplicate-media-id',
        mediaId,
        fileName: entry.file,
        message: `Duplicate file "${entry.file}" for media IDs "${seenFiles.get(entry.file)}" and "${mediaId}"`
      });
    } else {
      seenFiles.set(entry.file, mediaId);
    }
  }

  const referenced = collectReferencedMediaIds();
  for (const mediaId of referenced) {
    if (!media[mediaId]) {
      issues.push({
        code: 'unknown-media-id',
        mediaId,
        message: `Topic references unknown mediaId "${mediaId}"`
      });
    }
  }

  for (const mediaId of ids) {
    if (!referenced.has(mediaId)) {
      issues.push({
        code: 'unreferenced-file',
        mediaId,
        fileName: media[mediaId].file,
        message: `Catalog media "${mediaId}" is not referenced by any topic block`
      });
    }
  }

  const bundledStems = new Set(listBundledMediaStems());
  for (const stem of bundledStems) {
    const hasCatalogEntry = ids.some((id) => media[id].file.replace(/\.(jpe?g|png|webp)$/i, '') === stem);
    if (!hasCatalogEntry) {
      issues.push({
        code: 'orphan-file',
        fileName: `${stem}.jpg`,
        message: `Bundled media file stem "${stem}" has no catalog media entry`
      });
    }
  }

  const blocking = issues.filter((issue) => issue.code !== 'unreferenced-file');
  return { ok: blocking.length === 0, issues };
}

export function assertGuideMediaCatalogValid() {
  const result = validateGuideMediaCatalog();
  if (!result.ok) {
    const summary = result.issues.map((i) => i.message).join('\n');
    throw new Error(`Guide media catalog validation failed:\n${summary}`);
  }
}

export { listBundledMediaStems, listCatalogMediaIds };
