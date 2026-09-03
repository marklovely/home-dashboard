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
      const query = {
        async all() {
          if (normalized.includes('FROM guide_media')) {
            return { results: guideMedia };
          }
          if (normalized.includes('FROM appliance_manuals')) {
            return { results: applianceManuals };
          }
          return { results: [] };
        },
        async first() {
          return null;
        },
        async run() {}
      };

      return {
        bind(...args) {
          return {
            async all() {
              if (normalized.includes('FROM guide_media')) {
                if (normalized.includes('WHERE id')) {
                  const row = guideMedia.find((entry) => entry.id === args[0]);
                  return { results: row ? [row] : [] };
                }
                return { results: guideMedia };
              }
              if (normalized.includes('FROM appliance_manuals')) {
                if (normalized.includes('WHERE id')) {
                  const row = applianceManuals.find((entry) => entry.id === args[0]);
                  return { results: row ? [row] : [] };
                }
                return { results: applianceManuals };
              }
              return { results: [] };
            },
            async first() {
              if (normalized.includes('FROM guide_media WHERE id')) {
                return guideMedia.find((entry) => entry.id === args[0]) ?? null;
              }
              if (normalized.includes('FROM appliance_manuals WHERE id')) {
                return applianceManuals.find((entry) => entry.id === args[0]) ?? null;
              }
              return null;
            },
            async run() {
              if (normalized.includes('UPDATE guide_media')) {
                const row = guideMedia.find((entry) => entry.id === args[7]);
                if (row) {
                  row.alt = args[0];
                  row.object_key = args[1];
                  row.original_filename = args[3];
                  row.mime_type = args[4];
                  row.file_size = args[5];
                }
              }
              if (normalized.includes('UPDATE appliance_manuals SET')) {
                const row = applianceManuals.find((entry) => entry.id === args[14]);
                if (row) {
                  row.object_key = args[7];
                  row.original_filename = args[8];
                  row.mime_type = args[9];
                  row.file_size = args[10];
                  row.updated_at = args[13];
                }
              }
            }
          };
        },
        ...query
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

  it('restores photos and appliance manuals from a backup zip', async () => {
    const guideBucket = createInMemoryR2Bucket();
    const manualsBucket = createInMemoryR2Bucket();
    const db = createBackupMediaDb({
      guideMedia: [{ id: 'photo-1', alt: 'Kitchen', object_key: null, mime_type: 'image/jpeg' }],
      applianceManuals: [
        {
          id: 'manual-1',
          title: 'Oven',
          appliance_name: 'Oven',
          manufacturer: null,
          model: null,
          category: 'kitchen',
          location: null,
          description: null,
          object_key: 'restore-pending/manual-1',
          original_filename: 'oven-manual.pdf',
          mime_type: 'application/pdf',
          file_size: 0,
          published: 1,
          sort_order: 0,
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z'
        }
      ]
    });

    const { restoreSiteBackupMediaFromFiles } = await import('../src/lib/siteBackupArchive.js');
    const result = await restoreSiteBackupMediaFromFiles(
      {
        HOUSE_GUIDE_DB: db,
        APPLIANCE_MANUALS_DB: db,
        GUIDE_MEDIA: guideBucket,
        APPLIANCE_GUIDES: manualsBucket
      },
      {
        'media/photos/photo-1.jpg': new Uint8Array([1, 2, 3]),
        'media/appliance-manuals/manual-1-oven-manual.pdf': new Uint8Array([4, 5, 6])
      }
    );

    expect(result).toEqual({ photosRestored: 1, manualsRestored: 1 });
    expect([...guideBucket.objects.keys()]).toHaveLength(1);
    expect([...manualsBucket.objects.keys()]).toHaveLength(1);
  });
});
