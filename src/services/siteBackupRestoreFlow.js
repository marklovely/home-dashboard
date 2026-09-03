import { showConfirmDialog } from '../components/ConfirmDialog/confirmDialog.js';
import { showPasswordDialog } from '../components/PasswordDialog/passwordDialog.js';
import { restoreSiteBackup } from '../api/siteBackupApi.js';
import { applyShellBranding } from '../shell/shellBranding.js';
import {
  backupRestoreSummary,
  normalizeBackupForRestore,
  readJsonFile,
  resolveBackupDocument,
  uploadedMediaRestoreHint
} from '../utils/backupJson.js';
import { backupArchiveRestoreSummary } from '../utils/backupArchive.js';
import { refreshGuideContent } from './guideContentService.js';
import { refreshPrivateConfig } from './privateConfigService.js';
import { syncSiteProfileFromServer } from './siteProfileService.js';
import { syncSitterSecretsFromServer } from './sitterSecretsService.js';

/**
 * @param {File} file
 * @returns {Promise<{ backup: Record<string, unknown>, mediaZip: Uint8Array | null } | null>}
 */
export async function readAndConfirmSiteBackupRestore(file) {
  const raw = await readJsonFile(file);
  const resolved = await resolveBackupDocument(raw, () =>
    showPasswordDialog({
      title: 'Decrypt backup',
      message: 'Enter the password used when this backup was downloaded.',
      confirmLabel: 'Continue'
    })
  );
  const backup = normalizeBackupForRestore(resolved.backup);
  const uploaded = /** @type {{ id: string, alt: string }[]} */ (backup.guide?.uploadedMedia ?? []);
  const includesArchiveMedia = Boolean(resolved.mediaZip?.byteLength);
  const confirmed = await showConfirmDialog({
    title: 'Restore site backup?',
    message: `${backupRestoreSummary(backup)}${uploadedMediaRestoreHint(uploaded, includesArchiveMedia)}${
      includesArchiveMedia && resolved.mediaZip
        ? backupArchiveRestoreSummary(backup, resolved.mediaZip)
        : ''
    }`,
    confirmLabel: 'Restore',
    danger: true
  });
  if (!confirmed) return null;
  return { backup, mediaZip: resolved.mediaZip };
}

/**
 * @param {Record<string, unknown>} backup
 * @param {{ mediaZip?: Uint8Array | null }} [options]
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function runSiteBackupRestore(backup, options = {}) {
  const result = await restoreSiteBackup(backup, { mediaZip: options.mediaZip ?? null });
  if (!result.ok) {
    return { ok: false, message: result.message || 'Restore failed.' };
  }

  await syncSitterSecretsFromServer();
  await refreshGuideContent(fetch, { draft: true, force: true });
  await syncSiteProfileFromServer();
  await refreshPrivateConfig();
  applyShellBranding({
    shellEyebrow: document.querySelector('#shell-eyebrow'),
    shellTagline: document.querySelector('#shell-tagline')
  });
  return { ok: true };
}
