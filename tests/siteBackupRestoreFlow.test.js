import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { runSiteBackupRestore } from '../src/services/siteBackupRestoreFlow.js';

vi.mock('../src/api/siteBackupApi.js', () => ({
  restoreSiteBackup: vi.fn()
}));

vi.mock('../src/services/sitterSecretsService.js', () => ({
  syncSitterSecretsFromServer: vi.fn()
}));

vi.mock('../src/services/guideContentService.js', () => ({
  refreshGuideContent: vi.fn()
}));

vi.mock('../src/services/siteProfileService.js', () => ({
  syncSiteProfileFromServer: vi.fn()
}));

vi.mock('../src/services/privateConfigService.js', () => ({
  refreshPrivateConfig: vi.fn()
}));

vi.mock('../src/shell/shellBranding.js', () => ({
  applyShellBranding: vi.fn()
}));

import { restoreSiteBackup } from '../src/api/siteBackupApi.js';
import { syncSitterSecretsFromServer } from '../src/services/sitterSecretsService.js';
import { refreshGuideContent } from '../src/services/guideContentService.js';
import { syncSiteProfileFromServer } from '../src/services/siteProfileService.js';
import { refreshPrivateConfig } from '../src/services/privateConfigService.js';
import { applyShellBranding } from '../src/shell/shellBranding.js';

describe('runSiteBackupRestore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(restoreSiteBackup).mockResolvedValue({ ok: true });
    vi.mocked(syncSitterSecretsFromServer).mockResolvedValue(undefined);
    vi.mocked(refreshGuideContent).mockResolvedValue(undefined);
    vi.mocked(syncSiteProfileFromServer).mockResolvedValue(undefined);
    vi.mocked(refreshPrivateConfig).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('syncs client state after a successful restore', async () => {
    const result = await runSiteBackupRestore({ backupScope: 'full' });

    expect(result).toEqual({ ok: true });
    expect(restoreSiteBackup).toHaveBeenCalledWith({ backupScope: 'full' }, { mediaZip: null });
    expect(syncSitterSecretsFromServer).toHaveBeenCalledOnce();
    expect(refreshGuideContent).toHaveBeenCalledWith(fetch, { draft: true, force: true });
    expect(syncSiteProfileFromServer).toHaveBeenCalledOnce();
    expect(refreshPrivateConfig).toHaveBeenCalledOnce();
    expect(applyShellBranding).toHaveBeenCalledOnce();
  });

  it('returns the restore error without syncing when restore fails', async () => {
    vi.mocked(restoreSiteBackup).mockResolvedValue({ ok: false, message: 'Restore failed.' });

    const result = await runSiteBackupRestore({ backupScope: 'full' });

    expect(result).toEqual({ ok: false, message: 'Restore failed.' });
    expect(syncSiteProfileFromServer).not.toHaveBeenCalled();
  });
});
