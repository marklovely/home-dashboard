export const SITE_BACKUP_FORMAT_VERSION = 1;

/**
 * Strip runtime-only fields from an assembled guide catalog.
 *
 * @param {Record<string, unknown>} catalog
 */
export function catalogToImportFormat(catalog) {
  /** @type {Record<string, { alt: string, file?: string }>} */
  const media = {};
  for (const [id, asset] of Object.entries(catalog.media ?? {})) {
    const entry = /** @type {{ alt?: string, file?: string }} */ (asset);
    media[id] = {
      alt: entry.alt ?? '',
      ...(entry.file ? { file: entry.file } : {})
    };
  }

  return {
    version: catalog.version ?? 2,
    homeSummaryTitle: catalog.homeSummaryTitle,
    homeSummarySubtitle: catalog.homeSummarySubtitle ?? '',
    media,
    categories: (catalog.categories ?? []).map((category) => ({
      ...category,
      topics: (category.topics ?? []).map(topicToImportFormat)
    }))
  };
}

/**
 * @param {Record<string, unknown>} topic
 */
function topicToImportFormat(topic) {
  const clean = { ...topic };
  delete clean.hasDraft;
  delete clean.published;
  return clean;
}

/**
 * @param {Record<string, unknown> | null | undefined} catalog
 * @returns {{ id: string, alt: string }[]}
 */
export function uploadedMediaFromCatalog(catalog) {
  if (!catalog?.media) return [];
  /** @type {{ id: string, alt: string }[]} */
  const uploaded = [];
  for (const [id, asset] of Object.entries(catalog.media)) {
    const entry = /** @type {{ alt?: string, hasUpload?: boolean }} */ (asset);
    if (entry.hasUpload) {
      uploaded.push({ id, alt: entry.alt ?? '' });
    }
  }
  return uploaded;
}

/**
 * @param {{ catalog?: Record<string, unknown> | null, uploadedMedia?: { id: string, alt: string }[] }} guide
 */
export function buildGuideExportDocument(guide) {
  const catalog = guide.catalog ? catalogToImportFormat(guide.catalog) : null;
  const uploadedMedia =
    guide.uploadedMedia?.length ? guide.uploadedMedia : uploadedMediaFromCatalog(guide.catalog);

  return {
    formatVersion: SITE_BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    catalog,
    uploadedMedia
  };
}

/**
 * @param {{ seeded?: boolean, catalog?: Record<string, unknown> | null, uploadedMedia?: { id: string, alt: string }[] }} guide
 * @param {{ sitterSecretsDisclosed?: boolean }} [siteSettings]
 */
export function buildSiteBackupDocument(guide, siteSettings = {}) {
  const catalog = guide.catalog ? catalogToImportFormat(guide.catalog) : null;
  const uploadedMedia =
    guide.uploadedMedia?.length ? guide.uploadedMedia : uploadedMediaFromCatalog(guide.catalog);

  return {
    formatVersion: SITE_BACKUP_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    siteSettings: {
      sitterSecretsDisclosed: Boolean(siteSettings.sitterSecretsDisclosed)
    },
    guide: {
      seeded: Boolean(guide.seeded ?? catalog?.categories?.length),
      catalog,
      uploadedMedia
    }
  };
}

/**
 * @param {string} filename
 * @param {unknown} data
 */
export function downloadJsonFile(filename, data) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * @param {File} file
 * @returns {Promise<Record<string, unknown>>}
 */
export async function readJsonFile(file) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('File must contain a JSON object.');
  }
  return /** @type {Record<string, unknown>} */ (parsed);
}

/**
 * Normalize guide-only export files and full site backups for restore.
 *
 * @param {Record<string, unknown>} payload
 */
export function normalizeBackupForRestore(payload) {
  if (Array.isArray(payload.guide?.catalog?.categories) || payload.siteSettings) {
    return payload;
  }

  if (Array.isArray(payload.catalog?.categories)) {
    return {
      formatVersion: payload.formatVersion ?? 1,
      exportedAt: payload.exportedAt ?? new Date().toISOString(),
      siteSettings: {},
      guide: {
        seeded: true,
        catalog: payload.catalog,
        uploadedMedia: Array.isArray(payload.uploadedMedia) ? payload.uploadedMedia : []
      }
    };
  }

  if (Array.isArray(payload.categories)) {
    return {
      formatVersion: 1,
      exportedAt: new Date().toISOString(),
      siteSettings: {},
      guide: {
        seeded: true,
        catalog: payload,
        uploadedMedia: []
      }
    };
  }

  throw new Error('Unrecognised backup format.');
}

/**
 * @param {{ id: string, alt: string }[] | undefined} uploadedMedia
 */
export function uploadedMediaRestoreHint(uploadedMedia) {
  if (!uploadedMedia?.length) return '';
  return ` ${uploadedMedia.length} uploaded photo(s) are listed in the file — re-upload them in the Photo library after restore.`;
}
