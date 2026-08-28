import { describe, expect, it } from 'vitest';
import { showExtendStayDialog } from '../src/apps/Settings/sitterStayExtendDialog.js';

describe('showExtendStayDialog', () => {
  it('returns the chosen end date when confirmed', async () => {
    const promise = showExtendStayDialog({
      stayLabel: 'March sit',
      sitStart: '2026-03-12',
      sitEnd: '2026-03-19',
      formatDate: (iso) => iso
    });

    const overlay = document.querySelector('.extend-stay-dialog');
    expect(overlay).toBeTruthy();

    const dateInput = /** @type {HTMLInputElement | null} */ (
      overlay?.querySelector('.extend-stay-dialog-date')
    );
    expect(dateInput?.value).toBe('2026-03-19');
    if (dateInput) dateInput.value = '2026-03-26';

    const confirmButton = /** @type {HTMLButtonElement | null} */ (
      overlay?.querySelector('.button-primary')
    );
    confirmButton?.click();

    await expect(promise).resolves.toBe('2026-03-26');
    expect(document.querySelector('.extend-stay-dialog')).toBeNull();
  });

  it('returns null when cancelled', async () => {
    const promise = showExtendStayDialog({
      stayLabel: 'March sit',
      sitStart: '2026-03-12',
      sitEnd: '2026-03-19',
      formatDate: (iso) => iso
    });

    const cancelButton = /** @type {HTMLButtonElement | null} */ (
      document.querySelector('.extend-stay-dialog .button-secondary')
    );
    cancelButton?.click();

    await expect(promise).resolves.toBeNull();
  });
});
