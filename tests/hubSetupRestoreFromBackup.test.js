import { describe, expect, it } from 'vitest';
import { createHubSetupRestoreFromBackupBlock } from '../src/components/HubSetup/hubSetupRestoreFromBackup.js';

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
});
