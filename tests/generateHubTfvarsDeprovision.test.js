import { describe, expect, it } from 'vitest';
import { resolveSiteArchiveContract } from '../scripts/lib/resolve-site-archive-contract.mjs';

describe('generate-hub-tfvars deprovision fallbacks', () => {
  it('documents smith contract fields used during deprovision tfvars generation', () => {
    const resolved = resolveSiteArchiveContract('smith');
    expect(resolved).not.toBeNull();
    expect(['manifest', 'terraform', 'registry']).toContain(resolved?.source);
    expect(resolved?.site.hostname).toBe('smith.lovely-hub.com');
    expect(resolved?.site.hub_environment).toBe('smith');
    expect(resolved?.site.vanilla).toBe(false);
    expect(String(resolved?.site.worker_api_origin ?? '')).toContain('lovely-home-hub-api-smith');
    expect(resolved?.site.r2_guides_bucket).toBe('lovely-home-appliance-guides-smith');
    expect(resolved?.site.r2_media_bucket).toBe('lovely-home-guide-media-smith');
  });
});
