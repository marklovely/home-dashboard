import { unzipSync } from 'fflate';

/**
 * @param {Uint8Array} zipBytes
 */
export function unzipSiteBackupArchive(zipBytes) {
  return unzipSync(zipBytes);
}

/**
 * @param {Uint8Array} zipBytes
 */
export function readBackupJsonFromArchiveZip(zipBytes) {
  const files = unzipSiteBackupArchive(zipBytes);
  const backupBytes = files['backup.json'];
  if (!backupBytes) {
    throw new Error('Backup zip is missing backup.json.');
  }
  const backup = JSON.parse(new TextDecoder().decode(backupBytes));
  if (!backup || typeof backup !== 'object') {
    throw new Error('Backup zip contains invalid backup.json.');
  }
  return /** @type {Record<string, unknown>} */ (backup);
}

/**
 * @param {Uint8Array} zipBytes
 */
export function countArchiveMediaFiles(zipBytes) {
  const files = unzipSiteBackupArchive(zipBytes);
  return Object.keys(files).filter((path) => path.startsWith('media/')).length;
}

/**
 * @param {Record<string, unknown>} backup
 * @param {Uint8Array} zipBytes
 */
export function backupArchiveRestoreSummary(backup, zipBytes) {
  const mediaCount = countArchiveMediaFiles(zipBytes);
  const photoCount = Number(backup?.guide?.uploadedMedia?.length ?? 0);
  const manualCount = Array.isArray(backup?.applianceManuals) ? backup.applianceManuals.length : 0;
  const parts = [];
  if (photoCount > 0 || mediaCount > 0) {
    parts.push(`${Math.max(photoCount, 0)} photo(s)`);
  }
  if (manualCount > 0) {
    parts.push(`${manualCount} appliance manual(s)`);
  }
  if (!parts.length) return '';
  return ` This file also includes ${parts.join(' and ')} that will be restored automatically.`;
}
