import { describe, expect, it } from 'vitest';
import { resolveHubDeploySites } from '../scripts/resolve-hub-deploy-sites.mjs';
import { hubEnvironmentForSite, hubRuntimeConfigForSite } from '../scripts/write-hub-runtime-config.mjs';

describe('hub deploy CD helpers', () => {
  const registry = {
    demo: { terraform: true, hub_environment: 'demo' },
    larchmount: { terraform: true, hub_environment: 'larchmount' },
    lovely: { terraform: true, hub_environment: 'production' },
    legacy: { terraform: false }
  };

  it('resolves all terraform sites', () => {
    expect(resolveHubDeploySites('all', registry)).toEqual(['demo', 'larchmount', 'lovely']);
  });

  it('resolves an explicit site list', () => {
    expect(resolveHubDeploySites('demo,larchmount', registry)).toEqual(['demo', 'larchmount']);
  });

  it('rejects unknown and non-terraform sites', () => {
    expect(() => resolveHubDeploySites('missing', registry)).toThrow(/Unknown site/);
    expect(() => resolveHubDeploySites('legacy', registry)).toThrow(/not terraform-managed/);
  });

  it('maps hub_environment from registry manifest fallback', () => {
    expect(hubEnvironmentForSite('larchmount')).toBe('larchmount');
    expect(hubRuntimeConfigForSite('lovely')).toEqual({
      apiBaseUrl: '',
      hubEnvironment: 'production'
    });
  });
});
