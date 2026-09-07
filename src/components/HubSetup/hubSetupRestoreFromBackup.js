import { showToast } from '../../js/modules/toast.js';
import { withAsyncButtonFeedback } from '../../lib/asyncButtonFeedback.js';
import {
  readAndConfirmSiteBackupRestore,
  runSiteBackupRestore
} from '../../services/siteBackupRestoreFlow.js';

const RESTORE_BUTTON_LABEL = 'Restore from backup file';

/**
 * @param {HTMLInputElement} input
 * @returns {Promise<File>}
 */
export function pickBackupFile(input) {
  return new Promise((resolve, reject) => {
    let settled = false;
    /** @param {() => void} fn */
    const settle = (fn) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    const onChange = () => {
      const file = input.files?.[0];
      input.value = '';
      if (file) settle(() => resolve(file));
      else settle(() => reject(new Error('cancelled')));
    };

    const onWindowFocus = () => {
      window.setTimeout(() => {
        if (input.files?.length) return;
        settle(() => reject(new Error('cancelled')));
      }, 500);
    };

    const cleanup = () => {
      input.removeEventListener('change', onChange);
      window.removeEventListener('focus', onWindowFocus);
    };

    input.addEventListener('change', onChange);
    window.addEventListener('focus', onWindowFocus);
    input.click();
  });
}

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
  restoreButton.textContent = RESTORE_BUTTON_LABEL;

  const importInput = document.createElement('input');
  importInput.type = 'file';
  importInput.accept = 'application/json,.json';
  importInput.hidden = true;

  const status = document.createElement('p');
  status.className = 'hub-setup-restore-status subtle';
  status.hidden = true;
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  restoreButton.addEventListener('click', () => {
    void (async () => {
      try {
        await withAsyncButtonFeedback(restoreButton, 'Choose file…', async () => {
          status.hidden = false;
          status.textContent = 'Choose a backup file…';

          const file = await pickBackupFile(importInput);

          status.textContent = 'Reading backup…';
          restoreButton.textContent = 'Reading…';

          const restorePayload = await readAndConfirmSiteBackupRestore(file);
          if (!restorePayload) {
            status.textContent = 'Restore cancelled.';
            return;
          }

          restoreButton.textContent = 'Restoring…';
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
        if (error instanceof Error && error.message === 'cancelled') {
          status.hidden = false;
          status.textContent = 'No file chosen.';
          return;
        }
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
