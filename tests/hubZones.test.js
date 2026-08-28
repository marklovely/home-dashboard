import { describe, expect, it } from 'vitest';
import {
  ALLOWED_HUB_ZONE_NAMES,
  CUSTOMER_HUB_ZONE_NAME,
  PLATFORM_ZONE_NAME,
  defaultHostnameForSite,
  hostnameMatchesAllowedZone,
  resolveSiteZoneName,
  validateHubHostname,
  zoneNameForHostname
} from '../scripts/lib/hub-zones.mjs';

describe('hub zones', () => {
  it('recognizes platform and customer zone hostnames', () => {
    expect(hostnameMatchesAllowedZone('demo.lovely-home.co.uk')).toBe(true);
    expect(hostnameMatchesAllowedZone('smith.lovely-hub.com')).toBe(true);
    expect(hostnameMatchesAllowedZone('evil.example.com')).toBe(false);
  });

  it('resolves zone name from hostname', () => {
    expect(zoneNameForHostname('sandbox.lovely-home.co.uk')).toBe(PLATFORM_ZONE_NAME);
    expect(zoneNameForHostname('rose-cottage.lovely-hub.com')).toBe(CUSTOMER_HUB_ZONE_NAME);
    expect(zoneNameForHostname('unknown.test')).toBeNull();
  });

  it('builds default hostnames per zone', () => {
    expect(defaultHostnameForSite('smith', CUSTOMER_HUB_ZONE_NAME)).toBe('smith.lovely-hub.com');
    expect(defaultHostnameForSite('demo', PLATFORM_ZONE_NAME)).toBe('demo.lovely-home.co.uk');
    expect(defaultHostnameForSite('production', CUSTOMER_HUB_ZONE_NAME)).toBe(
      'dashboard.lovely-home.co.uk'
    );
  });

  it('resolves site zone from payload and protected ids', () => {
    expect(resolveSiteZoneName('demo', {})).toBe(PLATFORM_ZONE_NAME);
    expect(resolveSiteZoneName('production', {})).toBe(PLATFORM_ZONE_NAME);
    expect(
      resolveSiteZoneName('smith', { zone_name: CUSTOMER_HUB_ZONE_NAME }, PLATFORM_ZONE_NAME)
    ).toBe(CUSTOMER_HUB_ZONE_NAME);
    expect(
      resolveSiteZoneName('smith', { hostname: 'smith.lovely-hub.com' }, PLATFORM_ZONE_NAME)
    ).toBe(CUSTOMER_HUB_ZONE_NAME);
    expect(resolveSiteZoneName('smith', {}, CUSTOMER_HUB_ZONE_NAME)).toBe(CUSTOMER_HUB_ZONE_NAME);
  });

  it('validates hostnames under allowed zones', () => {
    expect(validateHubHostname('smith.lovely-hub.com')).toBeNull();
    expect(validateHubHostname('demo.lovely-home.co.uk')).toBeNull();
    expect(validateHubHostname('bad host')).toMatch(/valid DNS/i);
    expect(validateHubHostname('other.example.com')).toMatch(/must be under/i);
    expect(validateHubHostname('other.example.com', [PLATFORM_ZONE_NAME])).toMatch(/must be under/i);
    expect(ALLOWED_HUB_ZONE_NAMES).toContain(CUSTOMER_HUB_ZONE_NAME);
  });
});
