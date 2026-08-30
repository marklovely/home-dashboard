import { describe, expect, it } from 'vitest';
import {
  defaultSiteEntry,
  PROTECTED_SITE_IDS,
  validateBillingDeprovisionSiteId,
  validateDeploySiteId,
  validateDeprovisionSiteId,
  validateSiteId,
  validateSiteMutation
} from '../scripts/lib/site-registry.mjs';
import { validateSiteDeploy, validateSiteProvision, buildSiteManagePayload } from '../functions/api/platform/platformSiteMutations.js';

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

  it('defaults new customer sites to lovely-hub.com', () => {
    const entry = defaultSiteEntry('smith', { owner_emails: ['owner@example.com'] });
    expect(entry.hostname).toBe('smith.lovely-hub.com');
    expect(entry.zone_name).toBe('lovely-hub.com');
    expect(entry.hub_environment).toBe('smith');
  });

  it('requires owner emails on create', () => {
    const existing = {};
    expect(
      validateSiteMutation(
        'create',
        'demo',
        { hostname: 'demo.lovely-home.co.uk', hub_environment: 'demo', vanilla: true },
        existing,
        { zoneName: 'lovely-home.co.uk' }
      )
    ).toMatch(/owner email/i);
    expect(
      validateSiteMutation(
        'create',
        'demo',
        {
          hostname: 'demo.lovely-home.co.uk',
          hub_environment: 'demo',
          vanilla: true,
          owner_emails: ['owner@example.com']
        },
        existing,
        { zoneName: 'lovely-home.co.uk' }
      )
    ).toBeNull();
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

  it('blocks deprovision for protected sites and sites still in registry', () => {
    const registry = {
      demo: { hostname: 'demo.lovely-home.co.uk', hub_environment: 'demo', vanilla: true }
    };
    expect(validateDeprovisionSiteId('production', registry)).toMatch(/protected/i);
    expect(validateDeprovisionSiteId('demo', registry)).toMatch(/still in platform\/sites\.yaml/i);
    expect(validateDeprovisionSiteId('removed', {})).toBeNull();
  });

  it('requires billing deprovision site to remain in registry', () => {
    const registry = {
      practice: {
        hostname: 'practice.lovely-hub.com',
        hub_environment: 'practice',
        terraform: true
      }
    };
    expect(validateBillingDeprovisionSiteId('practice', registry)).toBeNull();
    expect(validateBillingDeprovisionSiteId('missing', registry)).toMatch(/not in platform\/sites\.yaml/i);
    expect(validateBillingDeprovisionSiteId('production', registry)).toMatch(/protected/i);
  });

  it('requires owner emails when creating a site via platform API', () => {
    const manifest = { platform: { zoneName: 'lovely-home.co.uk' }, sites: {} };
    const missing = buildSiteManagePayload(manifest, 'create', 'demo', {
      hostname: 'demo.lovely-home.co.uk'
    });
    expect(missing.ok).toBe(false);
    expect(missing.message).toMatch(/owner email/i);

    const ok = buildSiteManagePayload(manifest, 'create', 'demo', {
      hostname: 'demo.lovely-home.co.uk',
      ownerEmails: ['owner@example.com']
    });
    expect(ok.ok).toBe(true);
    expect(ok.payload.owner_emails).toEqual(['owner@example.com']);

    const customer = buildSiteManagePayload(manifest, 'create', 'rose-cottage', {
      ownerEmails: ['owner@example.com']
    });
    expect(customer.ok).toBe(true);
    expect(customer.payload.hostname).toBe('rose-cottage.lovely-hub.com');
    expect(customer.payload.zone_name).toBe('lovely-hub.com');
  });

  it('blocks create when site id is still in the platform manifest', () => {
    const manifest = {
      platform: { zoneName: 'lovely-home.co.uk' },
      sites: { demo: { siteId: 'demo', hostname: 'demo.lovely-home.co.uk' } }
    };
    const blocked = buildSiteManagePayload(manifest, 'create', 'demo', {
      hostname: 'demo.lovely-home.co.uk',
      ownerEmails: ['owner@example.com']
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.message).toMatch(/already exists in the platform manifest/i);
    expect(blocked.message).toMatch(/deprovision/i);
  });
});
