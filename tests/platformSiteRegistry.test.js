import { describe, expect, it } from 'vitest';
import {
  defaultSiteEntry,
  PROTECTED_SITE_IDS,
  validateSiteId,
  validateSiteMutation
} from '../scripts/lib/site-registry.mjs';

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
