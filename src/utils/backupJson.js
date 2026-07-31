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
