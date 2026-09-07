import { describe, expect, it } from 'vitest';
import {
  createHubSetupRestoreFromBackupBlock,
  pickBackupFile
} from '../src/components/HubSetup/hubSetupRestoreFromBackup.js';

describe('createHubSetupRestoreFromBackupBlock', () => {
  it('renders a restore button and hidden file input', () => {
    const block = createHubSetupRestoreFromBackupBlock(
      { toast: document.createElement('div') },
      () => {}
    );

    expect(block.className).toBe('hub-setup-restore');
    expect(block.querySelector('.hub-setup-restore-button')?.textContent).toBe(
      'Restore from backup file'
    );
    expect(block.querySelector('input[type="file"]')).toBeTruthy();
  });

  it('shows busy feedback as soon as restore is clicked', () => {
    const block = createHubSetupRestoreFromBackupBlock(
      { toast: document.createElement('div') },
      () => {}
    );
    document.body.append(block);
    const button = /** @type {HTMLButtonElement} */ (block.querySelector('.hub-setup-restore-button'));
    const status = /** @type {HTMLElement} */ (block.querySelector('.hub-setup-restore-status'));

    button.click();

    expect(button.disabled).toBe(true);
    expect(button.textContent).toBe('Choose file…');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(status.hidden).toBe(false);
    expect(status.textContent).toBe('Choose a backup file…');

    block.remove();
  });
});

describe('pickBackupFile', () => {
  it('resolves when a file is chosen', async () => {
    const input = document.createElement('input');
    input.type = 'file';
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    const picker = pickBackupFile(input);
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file]
    });
    input.dispatchEvent(new Event('change'));
    await expect(picker).resolves.toBe(file);
  });
});
