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
import { refreshGuideContent } from './guideContentService.js';
import { refreshPrivateConfig } from './privateConfigService.js';
import { syncSiteProfileFromServer } from './siteProfileService.js';
import { syncSitterSecretsFromServer } from './sitterSecretsService.js';

/**
 * @param {File} file
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function readAndConfirmSiteBackupRestore(file) {
  const raw = await readJsonFile(file);
  const decrypted = await resolveBackupDocument(raw, () =>
    showPasswordDialog({
      title: 'Decrypt backup',
      message: 'Enter the password used when this backup was downloaded.',
      confirmLabel: 'Continue'
    })
  );
  const backup = normalizeBackupForRestore(decrypted);
  const uploaded = /** @type {{ id: string, alt: string }[]} */ (backup.guide?.uploadedMedia ?? []);
  const confirmed = await showConfirmDialog({
    title: 'Restore site backup?',
    message: `${backupRestoreSummary(backup)}${uploadedMediaRestoreHint(uploaded)}`,
    confirmLabel: 'Restore',
    danger: true
  });
  if (!confirmed) return null;
  return backup;
}

/**
 * @param {Record<string, unknown>} backup
 * @returns {Promise<{ ok: boolean, message?: string }>}
 */
export async function runSiteBackupRestore(backup) {
  const result = await restoreSiteBackup(backup);
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
