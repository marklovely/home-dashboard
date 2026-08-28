import { describe, expect, it } from 'vitest';
import {
  manifestContractMissingUsageResponse,
  siteMissingManifestContract
} from '../functions/api/platform/manifestContractCopy.js';
import {
  extractAccountR2PayloadBytes,
  fetchSiteStorageUsage,
  normalizeD1DatabaseUsage,
  normalizeR2BucketUsage
} from '../functions/api/platform/platformCloudflareUsage.js';
import { renderSiteUsageSummary } from '../platform-admin/src/usage.js';
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

describe('manifest contract copy', () => {
  it('detects terraform sites missing manifest contract data', () => {
    expect(siteMissingManifestContract({ terraform: true, contract: null })).toBe(true);
    expect(siteMissingManifestContract({ terraform: true, contract: {} })).toBe(true);
    expect(
      siteMissingManifestContract({ terraform: true, contract: { d1_database_id: 'abc' } })
    ).toBe(false);
    expect(siteMissingManifestContract({ terraform: false, contract: null })).toBe(false);
  });

  it('returns rebuild guidance when usage has no D1 id in manifest', async () => {
    const result = await fetchSiteStorageUsage(
      { siteId: 'demo', terraform: true, contract: null },
      {},
      {
        CLOUDFLARE_ACCOUNT_ID: 'acc',
        PLATFORM_CF_API_TOKEN: 'token'
      }
    );
    expect(result).toEqual(manifestContractMissingUsageResponse());
  });

  it('renders usage hint in the platform admin UI', () => {
    const html = renderSiteUsageSummary(manifestContractMissingUsageResponse());
    expect(html).toMatch(/Platform manifest is missing/);
    expect(html).toMatch(/npm run platform:manifest/);
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
