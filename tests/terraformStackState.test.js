import { describe, expect, it } from 'vitest';
import { terraformStackStateError } from '../scripts/lib/assert-terraform-stack-state.mjs';
import { splitTerraformState } from '../scripts/lib/split-terraform-state.mjs';

describe('terraform stack state guard', () => {
  const registry = {
    production: { hostname: 'dashboard.lovely-home.co.uk', terraform: true },
    smith: { hostname: 'smith.lovely-hub.com', zone_name: 'lovely-hub.com', terraform: true }
  };

  it('rejects the legacy combined state on the customers backend', () => {
    const list = [
      'module.platform_admin[0].cloudflare_pages_project.platform',
      'module.hub_site["smith"].cloudflare_d1_database.this'
    ].join('\n');
    expect(terraformStackStateError('customers', list, registry)).toMatch(/legacy combined/);
  });

  it('rejects customer hubs still sitting in platform state', () => {
    const list = [
      'module.platform_admin[0].cloudflare_pages_project.platform',
      'module.hub_site["smith"].cloudflare_d1_database.this',
      'module.hub_site["production"].cloudflare_d1_database.this'
    ].join('\n');
    expect(terraformStackStateError('platform', list, registry)).toMatch(/other stack/);
  });

  it('rejects empty customers state while yaml still has household hubs', () => {
    expect(terraformStackStateError('customers', '', registry)).toMatch(/empty/);
  });

  it('accepts a split customers state', () => {
    const list = 'module.hub_site["smith"].cloudflare_d1_database.this\n';
    expect(terraformStackStateError('customers', list, registry)).toBeNull();
  });
});

describe('split terraform state', () => {
  it('moves customer hub_site modules into the customers file', () => {
    const registry = {
      production: { hostname: 'dashboard.lovely-home.co.uk' },
      smith: { hostname: 'smith.lovely-hub.com', zone_name: 'lovely-hub.com' }
    };
    const state = {
      version: 4,
      serial: 10,
      lineage: 'legacy-lineage',
      outputs: { sites: { value: {} } },
      resources: [
        { module: 'module.platform_admin[0]', type: 'cloudflare_pages_project', name: 'platform' },
        { module: 'module.hub_site["production"]', type: 'cloudflare_d1_database', name: 'this' },
        { module: 'module.hub_site["smith"]', type: 'cloudflare_d1_database', name: 'this' },
        { module: 'module.hub_site["e2e-abc"]', type: 'cloudflare_d1_database', name: 'this' }
      ]
    };
    const split = splitTerraformState(state, registry, {
      platformLineage: 'platform-lineage',
      customersLineage: 'customers-lineage',
      serial: 11
    });
    expect(split.counts).toEqual({ platform: 2, customers: 2, total: 4 });
    expect(split.platform.lineage).toBe('platform-lineage');
    expect(split.customers.outputs).toEqual({});
    expect(split.customers.resources.map((resource) => resource.module)).toEqual([
      'module.hub_site["smith"]',
      'module.hub_site["e2e-abc"]'
    ]);
    expect(split.platform.resources.map((resource) => resource.module)).toEqual([
      'module.platform_admin[0]',
      'module.hub_site["production"]'
    ]);
  });
});
