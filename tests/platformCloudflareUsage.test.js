import { describe, expect, it } from 'vitest';
import {
  extractAccountR2PayloadBytes,
  normalizeD1DatabaseUsage,
  normalizeR2BucketUsage
} from '../functions/api/platform/platformCloudflareUsage.js';
import {
  formatBytes,
  formatUsageLine,
  FREE_TIER_LIMITS,
  usagePercent,
  usageTone
} from '../platform-admin/src/usageFormat.js';

describe('platform usage formatting', () => {
  it('formats byte sizes for display', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(10 * 1024 ** 2)).toBe('10 MB');
    expect(formatBytes(5 * 1024 ** 3)).toBe('5 GB');
  });

  it('formats usage lines with free-tier limits', () => {
    expect(formatUsageLine(0, FREE_TIER_LIMITS.r2StorageBytes)).toBe(
      '0 B / 10 GB (0%)'
    );
  });

  it('calculates usage tone against free-tier limits', () => {
    expect(usagePercent(7 * 1024 ** 3, FREE_TIER_LIMITS.r2StorageBytes)).toBe(70);
    expect(usageTone(7 * 1024 ** 3, FREE_TIER_LIMITS.r2StorageBytes)).toBe('warn');
    expect(usageTone(9.5 * 1024 ** 3, FREE_TIER_LIMITS.r2StorageBytes)).toBe('bad');
  });
});

describe('platformCloudflareUsage normalization', () => {
  it('normalizes D1 and R2 API payloads', () => {
    expect(normalizeD1DatabaseUsage({ file_size: 2048, num_tables: 4 })).toEqual({
      fileSizeBytes: 2048,
      numTables: 4
    });
    expect(normalizeR2BucketUsage({ payloadSize: 4096, objectCount: 3 })).toEqual({
      payloadSizeBytes: 4096,
      metadataSizeBytes: 0,
      objectCount: 3
    });
  });

  it('extracts account R2 payload from metrics response', () => {
    expect(
      extractAccountR2PayloadBytes({
        standard: {
          published: { payloadSize: 1000, objects: 2 },
          uploaded: { payloadSize: 500, objects: 1 }
        },
        infrequent_access: {
          published: { payloadSize: 250, objects: 1 }
        }
      })
    ).toBe(1250);
  });
});
