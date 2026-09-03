import { describe, expect, it } from 'vitest';
import { resolveSiteArchiveContract } from '../scripts/lib/resolve-site-archive-contract.mjs';

describe('generate-hub-tfvars deprovision fallbacks', () => {
  it('resolves smith from platform manifest when terraform output is unavailable', () => {
    const resolved = resolveSiteArchiveContract('smith');
    expect(resolved?.source).toBe('manifest');
    expect(resolved?.site.hostname).toBe('smith.lovely-hub.com');
    expect(resolved?.site.hub_environment).toBe('smith');
    expect(resolved?.site.vanilla).toBe(false);
    expect(String(resolved?.site.worker_api_origin ?? '')).toContain('lovely-home-hub-api-smith');
  });
});
