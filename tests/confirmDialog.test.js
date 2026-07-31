import { describe, expect, it } from 'vitest';
import { showConfirmDialog } from '../src/components/ConfirmDialog/confirmDialog.js';

describe('showConfirmDialog', () => {
  it('resolves true when confirm is clicked', async () => {
    const promise = showConfirmDialog({
      title: 'Enable House Sitter Mode?',
      message: 'Owner-only apps will be hidden.',
      confirmLabel: 'Enable',
      cancelLabel: 'Cancel'
    });

    const dialog = document.querySelector('dialog.confirm-dialog');
    expect(dialog).toBeTruthy();
    expect(dialog?.textContent).toContain('Enable House Sitter Mode?');

    const confirmButton = /** @type {HTMLButtonElement | null} */ (
      dialog?.querySelector('.button-primary')
    );
    confirmButton?.click();

    await expect(promise).resolves.toBe(true);
    expect(document.querySelector('dialog.confirm-dialog')).toBeNull();
  });

  it('resolves false when cancel is clicked', async () => {
    const promise = showConfirmDialog({
      title: 'Enable House Sitter Mode?',
      message: 'Owner-only apps will be hidden.'
    });

    const cancelButton = /** @type {HTMLButtonElement | null} */ (
      document.querySelector('dialog.confirm-dialog .button-secondary')
    );
    cancelButton?.click();

    await expect(promise).resolves.toBe(false);
  });

  it('removes the dialog when closed', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'Message'
    });

    const dialog = document.querySelector('dialog.confirm-dialog');
    dialog?.dispatchEvent(new Event('cancel', { cancelable: true }));

    await expect(promise).resolves.toBe(false);
    expect(document.querySelector('dialog.confirm-dialog')).toBeNull();
  });
});
