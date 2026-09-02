import { describe, expect, it } from 'vitest';
import {
  hasTerraformContract,
  mergePlatformMeta,
  resolveSiteContract,
  siteManifestFields,
  terraformOutputIsAuthoritative
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

  it('drops the preserved contract when this stack no longer manages the site', () => {
    const contract = resolveSiteContract(
      'powell',
      { terraform: true, hostname: 'powell.lovely-hub.com', zone_name: 'lovely-hub.com' },
      { smith: { d1_database_id: 'from-tf' } },
      { powell: { contract: { d1_database_id: 'destroyed' } } },
      { terraformAvailable: true, terraformStack: 'customers' }
    );
    expect(contract).toBeNull();
  });

  it('keeps other-stack contracts when this apply only owns one estate', () => {
    const contract = resolveSiteContract(
      'production',
      { terraform: true, hostname: 'dashboard.lovely-home.co.uk' },
      { smith: { d1_database_id: 'from-tf' } },
      { production: { contract: { d1_database_id: 'kept' } } },
      { terraformAvailable: true, terraformStack: 'customers' }
    );
    expect(contract).toEqual({ d1_database_id: 'kept' });
  });

  it('keeps preserved contracts for sites terraform does not manage', () => {
    const contract = resolveSiteContract(
      'legacy',
      { terraform: false },
      { smith: { d1_database_id: 'from-tf' } },
      { legacy: { contract: { d1_database_id: 'hand-written' } } },
      { terraformAvailable: true }
    );
    expect(contract).toEqual({ d1_database_id: 'hand-written' });
  });

  it('does not trust an empty terraform output as an empty estate', () => {
    expect(terraformOutputIsAuthoritative(true, { smith: {} })).toBe(true);
    expect(terraformOutputIsAuthoritative(true, {})).toBe(false);
    expect(terraformOutputIsAuthoritative(false, { smith: {} })).toBe(false);
    expect(terraformOutputIsAuthoritative(true, null)).toBe(false);
  });

  it('keeps preserved contracts when terraform output cannot be read (Pages CI)', () => {
    const contract = resolveSiteContract(
      'smith',
      { terraform: true },
      {},
      { smith: { contract: { d1_database_id: 'from-file' } } },
      { terraformAvailable: false }
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
