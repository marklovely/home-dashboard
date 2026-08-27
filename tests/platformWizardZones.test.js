import { describe, expect, it } from 'vitest';
import {
  ALLOWED_HUB_ZONE_NAMES,
  CUSTOMER_HUB_ZONE_NAME,
  defaultCustomerZoneName,
  hostnameForSite,
  hostnameUsesAllowedZone,
  validateWizardHostname,
  zoneNameForHostname
} from '../platform-admin/src/wizardZones.js';

describe('platform wizard zones', () => {
  it('defaults new customer sites to lovely-hub.com', () => {
    expect(defaultCustomerZoneName({})).toBe(CUSTOMER_HUB_ZONE_NAME);
    expect(hostnameForSite('rose-cottage', CUSTOMER_HUB_ZONE_NAME)).toBe(
      'rose-cottage.lovely-hub.com'
    );
  });

  it('accepts hostnames on either hub zone', () => {
    expect(validateWizardHostname('smith.lovely-hub.com')).toBeNull();
    expect(validateWizardHostname('sandbox.lovely-home.co.uk')).toBeNull();
    expect(validateWizardHostname('invalid.example.com')).toMatch(/must be under/i);
  });

  it('detects zone from hostname', () => {
    expect(zoneNameForHostname('smith.lovely-hub.com')).toBe(CUSTOMER_HUB_ZONE_NAME);
    expect(zoneNameForHostname('demo.lovely-home.co.uk')).toBe('lovely-home.co.uk');
  });

  it('tracks whether hostname is still on an allowed zone', () => {
    expect(hostnameUsesAllowedZone('')).toBe(true);
    expect(hostnameUsesAllowedZone('rose-cottage.lovely-hub.com')).toBe(true);
    expect(hostnameUsesAllowedZone('other.example.com')).toBe(false);
    expect(ALLOWED_HUB_ZONE_NAMES).toContain(CUSTOMER_HUB_ZONE_NAME);
  });
});
