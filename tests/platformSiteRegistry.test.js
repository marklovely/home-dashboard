import { describe, expect, it } from 'vitest';
import {
  defaultSiteEntry,
  PROTECTED_SITE_IDS,
  validateDeploySiteId,
  validateSiteId,
  validateSiteMutation
} from '../scripts/lib/site-registry.mjs';
import { validateSiteDeploy, validateSiteProvision } from '../functions/api/platform/platformSiteMutations.js';

describe('site registry validation', () => {
  it('accepts valid site ids', () => {
    expect(validateSiteId('demo')).toBeNull();
    expect(validateSiteId('staging-2')).toBeNull();
  });

  it('rejects invalid site ids', () => {
    expect(validateSiteId('')).toBeTruthy();
    expect(validateSiteId('Demo')).toBeTruthy();
  });

  it('creates default hostname under zone', () => {
    const entry = defaultSiteEntry('demo', {}, 'lovely-home.co.uk');
    expect(entry.hostname).toBe('demo.lovely-home.co.uk');
    expect(entry.hub_environment).toBe('demo');
    expect(entry.vanilla).toBe(true);
  });

  it('blocks provision for production and unknown sites', () => {
    const manifest = {
      sites: {
        demo: { siteId: 'demo', hostname: 'demo.lovely-home.co.uk' }
      }
    };
    expect(validateSiteProvision('production', manifest).ok).toBe(false);
    expect(validateSiteProvision('missing', manifest).ok).toBe(false);
    expect(validateSiteProvision('demo', manifest).ok).toBe(true);
  });

  it('blocks deploy for production and unknown sites', () => {
    const manifest = {
      sites: {
        test: { siteId: 'test', hostname: 'test.lovely-home.co.uk' }
      }
    };
    expect(validateDeploySiteId('production')).toMatch(/production/i);
    expect(validateDeploySiteId('bad;id')).toBeTruthy();
    expect(validateSiteDeploy('production', manifest).ok).toBe(false);
    expect(validateSiteDeploy('missing', manifest).ok).toBe(false);
    expect(validateSiteDeploy('test', manifest).ok).toBe(true);
  });

  it('blocks delete for protected sites', () => {
    const existing = {
      production: {
        hostname: 'dashboard.lovely-home.co.uk',
        hub_environment: 'production',
        vanilla: false
      }
    };
    expect(PROTECTED_SITE_IDS.has('production')).toBe(true);
    expect(
      validateSiteMutation('delete', 'production', {}, existing, {
        zoneName: 'lovely-home.co.uk'
      })
    ).toMatch(/protected/i);
  });
});
