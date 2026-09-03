import { decryptBackupDocument, encryptBackupDocument, isEncryptedBackupDocument, isEncryptedBackupZipEnvelope } from './backupEncryption.js';

export const SITE_BACKUP_FORMAT_VERSION = 2;
export const SITE_BACKUP_FORMAT_VERSION_LEGACY = 1;

/** @typedef {'full' | 'guide'} SiteBackupScope */

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
    backupScope: 'guide',
    exportedAt: new Date().toISOString(),
    catalog,
    uploadedMedia
  };
}

/**
 * @param {{ seeded?: boolean, catalog?: Record<string, unknown> | null, uploadedMedia?: { id: string, alt: string }[] }} guide
 * @param {{ sitterSecretsDisclosed?: boolean, sitterAccessEmails?: string[] }} [siteSettings]
 * @param {{ scope?: SiteBackupScope, siteProfile?: Record<string, unknown>, hubSecrets?: Record<string, string> }} [options]
 */
export function buildSiteBackupDocument(guide, siteSettings = {}, options = {}) {
  const scope = options.scope === 'guide' ? 'guide' : 'full';
  const catalog = guide.catalog ? catalogToImportFormat(guide.catalog) : null;
  const uploadedMedia =
    guide.uploadedMedia?.length ? guide.uploadedMedia : uploadedMediaFromCatalog(guide.catalog);

  /** @type {Record<string, unknown>} */
  const payload = {
    formatVersion: SITE_BACKUP_FORMAT_VERSION,
    backupScope: scope,
    exportedAt: new Date().toISOString(),
    siteSettings: {
      sitterSecretsDisclosed: Boolean(siteSettings.sitterSecretsDisclosed),
      ...(Array.isArray(siteSettings.sitterAccessEmails)
        ? { sitterAccessEmails: siteSettings.sitterAccessEmails }
        : {})
    },
    guide: {
      seeded: Boolean(guide.seeded ?? catalog?.categories?.length),
      catalog,
      uploadedMedia
    }
  };

  if (scope === 'full' && options.siteProfile) {
    payload.siteProfile = options.siteProfile;
  }
  if (scope === 'full' && options.hubSecrets && Object.keys(options.hubSecrets).length > 0) {
    payload.hubSecrets = options.hubSecrets;
  }

  return payload;
}

/**
 * @param {Record<string, unknown>} backup
 * @returns {SiteBackupScope}
 */
export function backupScopeOf(backup) {
  if (backup.backupScope === 'guide') return 'guide';
  if (backup.siteProfile || backup.hubSecrets) return 'full';
  return 'guide';
}

/**
 * @param {Record<string, unknown>} backup
 */
export function hasFullBackupContent(backup) {
  const hasProfile = backup.siteProfile && typeof backup.siteProfile === 'object';
  const hasSecrets =
    backup.hubSecrets &&
    typeof backup.hubSecrets === 'object' &&
    Object.keys(backup.hubSecrets).length > 0;
  return Boolean(hasProfile || hasSecrets);
}

/**
 * @param {import('../api/privateConfigApi.js').WorkerPrivateConfig | null | undefined} config
 */
export function hubSecretsFromPrivateConfig(config) {
  /** @type {Record<string, string>} */
  const secrets = {};
  if (!config) return secrets;
  if (config.wifi?.ssid) secrets.wifi_ssid = config.wifi.ssid;
  if (config.wifi?.password) secrets.wifi_password = config.wifi.password;
  if (config.contacts?.mark?.phone) secrets.primary_phone = config.contacts.mark.phone;
  if (config.contacts?.mark?.email) secrets.primary_email = config.contacts.mark.email;
  if (config.contacts?.donna?.phone) secrets.secondary_phone = config.contacts.donna.phone;
  if (config.contacts?.donna?.email) secrets.secondary_email = config.contacts.donna.email;
  if (config.home?.address) secrets.home_address = config.home.address;
  if (config.lockbox?.code) secrets.lockbox_code = config.lockbox.code;
  return secrets;
}

/**
 * @param {Record<string, unknown>} backup
 */
export function backupRestoreSummary(backup) {
  const scope = backupScopeOf(backup);
  if (scope === 'full') {
    return 'This replaces House Guide content, home details, and saved secrets (Wi‑Fi, PIN, lockbox, etc.) on this hub.';
  }
  return 'This replaces House Guide content on this hub.';
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
 * @param {string} filename
 * @param {Record<string, unknown>} backup
 * @param {string} password
 */
export async function downloadEncryptedBackupFile(filename, backup, password) {
  const envelope = await encryptBackupDocument(backup, password);
  downloadJsonFile(filename, envelope);
}

/**
 * @param {string} filename
 * @param {ArrayBuffer | Uint8Array} zipBytes
 * @param {string} password
 */
export async function downloadEncryptedBackupZipFile(filename, zipBytes, password) {
  const bytes = zipBytes instanceof Uint8Array ? zipBytes : new Uint8Array(zipBytes);
  const envelope = await encryptBackupDocument(bytes, password, { payloadType: 'zip' });
  downloadJsonFile(filename, envelope);
}

export { isEncryptedBackupDocument, isEncryptedBackupZipEnvelope, decryptBackupDocument };

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
 * @param {Record<string, unknown>} parsed
 * @param {() => Promise<string | null>} promptPassword
 * @returns {Promise<{ backup: Record<string, unknown>, mediaZip: Uint8Array | null }>}
 */
export async function resolveBackupDocument(parsed, promptPassword) {
  if (!isEncryptedBackupDocument(parsed)) {
    return { backup: parsed, mediaZip: null };
  }
  const password = await promptPassword();
  if (!password) {
    throw new Error('Restore cancelled.');
  }
  const decrypted = await decryptBackupDocument(parsed, password);
  if (decrypted instanceof Uint8Array) {
    const { readBackupJsonFromArchiveZip } = await import('./backupArchive.js');
    return { backup: readBackupJsonFromArchiveZip(decrypted), mediaZip: decrypted };
  }
  return { backup: decrypted, mediaZip: null };
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
 * @param {boolean} [includesArchiveMedia]
 */
export function uploadedMediaRestoreHint(uploadedMedia, includesArchiveMedia = false) {
  if (includesArchiveMedia) return '';
  if (!uploadedMedia?.length) return '';
  return ` ${uploadedMedia.length} uploaded photo(s) are listed in the file — re-upload them in the Photo library after restore.`;
}
