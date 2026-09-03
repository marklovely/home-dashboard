import { showToast } from '../../js/modules/toast.js';
import { withAsyncButtonFeedback } from '../../lib/asyncButtonFeedback.js';
import {
  readAndConfirmSiteBackupRestore,
  runSiteBackupRestore
} from '../../services/siteBackupRestoreFlow.js';

/**
 * @param {import('../../types/app.js').ShellContext} context
 * @param {() => void} onRestored
 */
export function createHubSetupRestoreFromBackupBlock(context, onRestored) {
  const wrap = document.createElement('div');
  wrap.className = 'hub-setup-restore';

  const copy = document.createElement('p');
  copy.className = 'hub-setup-restore-copy subtle';
  copy.textContent =
    'Already have a backup file? Restore it to load your House Guide, home details, photos, appliance manuals, and secrets — and skip the setup steps.';

  const restoreButton = document.createElement('button');
  restoreButton.type = 'button';
  restoreButton.className = 'settings-action-button settings-action-button--secondary hub-setup-restore-button';
  restoreButton.textContent = 'Restore from backup file';

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.hidden = true;

  const status = document.createElement('p');
  status.className = 'hub-setup-restore-status subtle';
  status.hidden = true;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  restoreButton.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;

    void (async () => {
      try {
        const restorePayload = await readAndConfirmSiteBackupRestore(file);
        if (!restorePayload) return;

        await withAsyncButtonFeedback(restoreButton, 'Restoring…', async () => {
          status.hidden = false;
          status.textContent = 'Restoring backup…';
          showToast(context.toast, 'Restoring backup…', 120000);

          const result = await runSiteBackupRestore(restorePayload.backup, {
            mediaZip: restorePayload.mediaZip
          });
          if (!result.ok) {
            status.textContent = result.message || 'Restore failed.';
            showToast(context.toast, result.message || 'Restore failed.');
            return;
          }

          status.textContent = 'Backup restored.';
          showToast(context.toast, 'Site backup restored. Setup complete.');
          onRestored();
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid backup file.';
        status.hidden = false;
        status.textContent = message;
        showToast(context.toast, message);
      }
    })();
  });

  wrap.append(copy, restoreButton, importInput, status);
  return wrap;
}
