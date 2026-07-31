import { describe, expect, it, vi } from 'vitest';
import { isTestHubEnvironment, resetHubEnvironmentForTests } from '../src/auth/hubEnvironment.js';
import {
  buildSiteBackupDocument,
  catalogToImportFormat,
  normalizeBackupForRestore,
  uploadedMediaFromCatalog,
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

  it('strips runtime fields from assembled catalogs', () => {
    const catalog = catalogToImportFormat({
      version: 2,
      homeSummaryTitle: 'Hi',
      homeSummarySubtitle: 'There',
      media: {
        photo: { alt: 'Kitchen', file: 'photo.jpg', hasUpload: true }
      },
      categories: []
    });
    expect(catalog.media.photo).toEqual({ alt: 'Kitchen', file: 'photo.jpg' });
    expect(catalog.media.photo).not.toHaveProperty('hasUpload');
  });

  it('collects uploaded media ids from assembled catalogs', () => {
    expect(
      uploadedMediaFromCatalog({
        media: {
          a: { alt: 'A', hasUpload: true },
          b: { alt: 'B', hasUpload: false }
        }
      })
    ).toEqual([{ id: 'a', alt: 'A' }]);
  });

  it('builds a site backup document from legacy guide data', () => {
    const payload = buildSiteBackupDocument(
      {
        seeded: true,
        catalog: {
          version: 2,
          homeSummaryTitle: 'Hi',
          homeSummarySubtitle: '',
          media: {},
          categories: []
        }
      },
      { sitterSecretsDisclosed: true }
    );
    expect(payload.formatVersion).toBe(1);
    expect(payload.siteSettings.sitterSecretsDisclosed).toBe(true);
    expect(payload.guide.seeded).toBe(true);
  });
});
