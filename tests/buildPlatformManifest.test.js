import { describe, expect, it } from 'vitest';
import {
  hasTerraformContract,
  mergePlatformMeta,
  resolveSiteContract,
  siteManifestFields
} from '../scripts/lib/platformManifestMerge.mjs';

describe('platform manifest merge', () => {
  it('detects non-empty terraform contracts', () => {
    expect(hasTerraformContract(null)).toBe(false);
    expect(hasTerraformContract({ d1_database_id: 'abc' })).toBe(true);
  });

  it('prefers live terraform output over preserved manifest', () => {
    const contract = resolveSiteContract(
      'smith',
      { terraform: true },
      { smith: { d1_database_id: 'from-tf' } },
      { smith: { contract: { d1_database_id: 'from-file' } } }
    );
    expect(contract).toEqual({ d1_database_id: 'from-tf' });
  });

  it('falls back to preserved contract when terraform output is missing', () => {
    const contract = resolveSiteContract(
      'smith',
      { terraform: true },
      {},
      { smith: { contract: { d1_database_id: 'from-file' } } }
    );
    expect(contract).toEqual({ d1_database_id: 'from-file' });
  });

  it('merges platform meta without overwriting fresh values', () => {
    const merged = mergePlatformMeta(
      { cloudflareAccountId: 'new' },
      { cloudflareAccountId: 'old', zoneName: 'lovely-home.co.uk' }
    );
    expect(merged.cloudflareAccountId).toBe('new');
    expect(merged.zoneName).toBe('lovely-home.co.uk');
  });

  it('derives worker and pages fields from contract', () => {
    const fields = siteManifestFields('smith', {
      pages_project: 'home-dashboard-smith',
      worker_name: 'lovely-home-hub-api-smith',
      pages_url: 'https://smith.lovely-hub.com',
      worker_api_origin: 'https://lovely-home-hub-api-smith.example.workers.dev'
    }, 'smith.lovely-hub.com');
    expect(fields.pagesProject).toBe('home-dashboard-smith');
    expect(fields.workerApiOrigin).toContain('smith');
  });
});
