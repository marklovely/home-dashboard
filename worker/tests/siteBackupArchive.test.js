import { describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';

vi.mock('../src/lib/siteBackupPayload.js', () => ({
  buildSiteBackupPayload: vi.fn(async () => ({
    formatVersion: 2,
    backupScope: 'full',
    exportedAt: '2026-01-01T00:00:00.000Z',
    guide: { seeded: true, catalog: { categories: [], media: {} }, uploadedMedia: [] },
    applianceManuals: [{ id: 'manual-1', originalFilename: 'oven-manual.pdf' }]
  }))
}));

import { buildSiteBackupZipBytes } from '../src/lib/siteBackupArchive.js';
import { createInMemoryR2Bucket } from './mocks/applianceManualsStorage.js';

/**
 * @param {{
 *   guideMedia?: Record<string, unknown>[];
 *   applianceManuals?: Record<string, unknown>[];
 * }} [seed]
 */
function createBackupMediaDb(seed = {}) {
  const guideMedia = seed.guideMedia ?? [];
  const applianceManuals = seed.applianceManuals ?? [];

  return /** @type {D1Database} */ ({
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim();
      return {
        bind() {
          return this;
        },
        async all() {
          if (normalized.includes('FROM guide_media')) {
            return { results: guideMedia };
          }
          if (normalized.includes('FROM appliance_manuals')) {
            return { results: applianceManuals };
          }
          return { results: [] };
        }
      };
    }
  });
}

describe('siteBackupArchive', () => {
  it('builds a zip with backup.json and media files', async () => {
    const guideBucket = createInMemoryR2Bucket();
    const manualsBucket = createInMemoryR2Bucket();

    await guideBucket.put('media/photo-1', new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: 'image/jpeg' }
    });
    await manualsBucket.put('guides/manual-1.pdf', new Uint8Array([4, 5, 6]), {
      httpMetadata: { contentType: 'application/pdf' }
    });

    const env = {
      HOUSE_GUIDE_DB: createBackupMediaDb({
        guideMedia: [{ id: 'photo-1', object_key: 'media/photo-1', mime_type: 'image/jpeg' }],
        applianceManuals: [
          {
            id: 'manual-1',
            object_key: 'guides/manual-1.pdf',
            mime_type: 'application/pdf',
            original_filename: 'oven-manual.pdf'
          }
        ]
      }),
      GUIDE_MEDIA: guideBucket,
      APPLIANCE_GUIDES: manualsBucket
    };

    const zipBytes = await buildSiteBackupZipBytes(env, { scope: 'full' });
    const files = unzipSync(zipBytes);

    expect(files['backup.json']).toBeTruthy();
    const backup = JSON.parse(new TextDecoder().decode(files['backup.json']));
    expect(backup.formatVersion).toBe(2);
    expect(files['media/photos/photo-1.jpg']).toEqual(new Uint8Array([1, 2, 3]));
    expect(files['media/appliance-manuals/manual-1-oven-manual.pdf']).toEqual(new Uint8Array([4, 5, 6]));
  });
});
