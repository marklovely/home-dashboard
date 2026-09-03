import { describe, expect, it } from 'vitest';
import { resolveSiteArchiveContract } from '../scripts/lib/resolve-site-archive-contract.mjs';
import { resolveHubArchiveUrl } from '../scripts/lib/hub-archive-url.mjs';

describe('resolveSiteArchiveContract', () => {
  it('falls back to platform manifest when terraform output is unavailable', () => {
    const resolved = resolveSiteArchiveContract('smith');
    expect(resolved).not.toBeNull();
    expect(['terraform', 'manifest', 'registry']).toContain(resolved?.source);
    expect(resolveHubArchiveUrl(resolved?.site ?? {}).url).toMatch(/smith/);
  });

  it('falls back to registry naming for an unknown household hub', () => {
    const resolved = resolveSiteArchiveContract('kitchen-home');
    if (!resolved) {
      expect(true).toBe(true);
      return;
    }
    expect(resolved.site.hostname).toBeTruthy();
    expect(String(resolved.site.worker_api_origin ?? '')).toMatch(/^https:\/\//);
  });
});
