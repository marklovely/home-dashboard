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

    const overlay = document.querySelector('.confirm-dialog-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay?.textContent).toContain('Enable House Sitter Mode?');

    const confirmButton = /** @type {HTMLButtonElement | null} */ (
      overlay?.querySelector('.button-primary')
    );
    confirmButton?.click();

    await expect(promise).resolves.toBe(true);
    expect(document.querySelector('.confirm-dialog-overlay')).toBeNull();
  });

  it('resolves false when cancel is clicked', async () => {
    const promise = showConfirmDialog({
      title: 'Enable House Sitter Mode?',
      message: 'Owner-only apps will be hidden.'
    });

    const cancelButton = /** @type {HTMLButtonElement | null} */ (
      document.querySelector('.confirm-dialog-overlay .button-secondary')
    );
    cancelButton?.click();

    await expect(promise).resolves.toBe(false);
  });

  it('removes the dialog when Escape is pressed', async () => {
    const promise = showConfirmDialog({
      title: 'Test',
      message: 'Message'
    });

    const overlay = document.querySelector('.confirm-dialog-overlay');
    overlay?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await expect(promise).resolves.toBe(false);
    expect(document.querySelector('.confirm-dialog-overlay')).toBeNull();
  });
});
