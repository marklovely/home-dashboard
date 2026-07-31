import { describe, expect, it, vi } from 'vitest';
import { isTestHubEnvironment, resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';
import {
  normalizeBackupForRestore,
  uploadedMediaRestoreHint
} from '../src/utils/backupJson.js';

describe('hubEnvironment', () => {
  it('detects test hostname', () => {
    resetHubEnvironmentForTests();
    vi.stubGlobal('location', { hostname: 'test.lovely-home.co.uk' });
    expect(isTestHubEnvironment()).toBe(true);
    resetHubEnvironmentForTests();
    vi.unstubAllGlobals();
  });
});

describe('backupJson', () => {
  it('wraps guide-only export payloads for restore', () => {
    const payload = normalizeBackupForRestore({
      formatVersion: 1,
      catalog: { version: 2, categories: [], media: {}, homeSummaryTitle: 'Hi', homeSummarySubtitle: '' },
      uploadedMedia: [{ id: 'a', alt: 'A' }]
    });
    expect(payload.guide.catalog.categories).toEqual([]);
    expect(payload.guide.uploadedMedia).toHaveLength(1);
  });

  it('passes through full site backup payloads', () => {
    const payload = normalizeBackupForRestore({
      formatVersion: 1,
      siteSettings: { sitterSecretsDisclosed: true },
      guide: { seeded: true, catalog: { categories: [] }, uploadedMedia: [] }
    });
    expect(payload.siteSettings.sitterSecretsDisclosed).toBe(true);
  });

  it('builds uploaded media restore hint', () => {
    expect(uploadedMediaRestoreHint([])).toBe('');
    expect(uploadedMediaRestoreHint([{ id: 'a', alt: 'A' }])).toContain('re-upload');
  });
});
