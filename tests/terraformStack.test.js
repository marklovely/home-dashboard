import { describe, expect, it } from 'vitest';
import {
  isTerraformStack,
  partitionSiteIdsByStack,
  siteIdsForTerraformStack,
  terraformBackendKey,
  terraformStackForSite,
  guessTerraformStackForMissingSite
} from '../scripts/lib/terraform-stack.mjs';

describe('terraform stacks', () => {
  it('puts lovely-home.co.uk hubs on the platform stack', () => {
    expect(terraformStackForSite('production', { hostname: 'dashboard.lovely-home.co.uk' })).toBe('platform');
    expect(terraformStackForSite('demo', { hostname: 'demo.lovely-home.co.uk' })).toBe('platform');
    expect(terraformStackForSite('sandbox', { hostname: 'sandbox.lovely-home.co.uk' })).toBe('platform');
  });

  it('puts lovely-hub.com hubs on the customers stack', () => {
    expect(
      terraformStackForSite('smith', { hostname: 'smith.lovely-hub.com', zone_name: 'lovely-hub.com' })
    ).toBe('customers');
    expect(terraformStackForSite('e2e-abc', { hostname: 'e2e-abc.lovely-hub.com' })).toBe('customers');
  });

  it('honours an explicit customer_hub flag', () => {
    expect(terraformStackForSite('odd', { hostname: 'odd.lovely-home.co.uk', customer_hub: true })).toBe(
      'customers'
    );
    expect(terraformStackForSite('odd', { hostname: 'odd.lovely-hub.com', customer_hub: false })).toBe('platform');
  });

  it('lists site ids for a stack and maps backend keys', () => {
    const registry = {
      demo: { hostname: 'demo.lovely-home.co.uk' },
      smith: { hostname: 'smith.lovely-hub.com', zone_name: 'lovely-hub.com' }
    };
    expect(siteIdsForTerraformStack(registry, 'platform')).toEqual(['demo']);
    expect(siteIdsForTerraformStack(registry, 'customers')).toEqual(['smith']);
    expect(terraformBackendKey('customers')).toBe('home-dashboard/customers.tfstate');
    expect(terraformBackendKey('platform')).toBe('home-dashboard/platform.tfstate');
    expect(isTerraformStack('customers')).toBe(true);
    expect(isTerraformStack('hubs')).toBe(false);
  });

  it('guesses the stack when the site is already gone from yaml', () => {
    expect(guessTerraformStackForMissingSite('demo')).toBe('platform');
    expect(guessTerraformStackForMissingSite('e2e-c5ajyxnu')).toBe('customers');
    expect(guessTerraformStackForMissingSite('smith')).toBe('customers');
  });

  it('partitions mixed site ids onto both stacks', () => {
    const registry = {
      demo: { hostname: 'demo.lovely-home.co.uk' },
      smith: { hostname: 'smith.lovely-hub.com', zone_name: 'lovely-hub.com' }
    };
    expect(partitionSiteIdsByStack(['demo', 'smith'], registry)).toEqual({
      platform: ['demo'],
      customers: ['smith']
    });
  });
});
