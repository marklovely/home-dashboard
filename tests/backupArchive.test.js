import { describe, expect, it } from 'vitest';
import { zipSync } from 'fflate';
import {
  backupArchiveRestoreSummary,
  countArchiveMediaFiles,
  readBackupJsonFromArchiveZip
} from '../src/utils/backupArchive.js';

describe('backupArchive', () => {
  it('reads backup.json from a zip archive', () => {
    const zipBytes = zipSync({
      'backup.json': new TextEncoder().encode(
        JSON.stringify({ formatVersion: 2, backupScope: 'full', guide: { uploadedMedia: [] } })
      ),
      'media/photos/kitchen.jpg': new Uint8Array([1, 2, 3])
    });

    const backup = readBackupJsonFromArchiveZip(zipBytes);
    expect(backup.formatVersion).toBe(2);
    expect(countArchiveMediaFiles(zipBytes)).toBe(1);
  });

  it('summarises archive media for restore confirmation', () => {
    const zipBytes = zipSync({
      'backup.json': new TextEncoder().encode(
        JSON.stringify({
          guide: { uploadedMedia: [{ id: 'kitchen', alt: 'Kitchen' }] },
          applianceManuals: [{ id: 'manual-1' }]
        })
      ),
      'media/photos/kitchen.jpg': new Uint8Array([1]),
      'media/appliance-manuals/manual-1-oven.pdf': new Uint8Array([2])
    });

    expect(backupArchiveRestoreSummary(readBackupJsonFromArchiveZip(zipBytes), zipBytes)).toMatch(
      /photo\(s\).*appliance manual\(s\)/i
    );
  });
});
