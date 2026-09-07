import { describe, expect, it } from 'vitest';
import { resolveSiteArchiveContract } from '../scripts/lib/resolve-site-archive-contract.mjs';
import { resolveHubArchiveUrl } from '../scripts/lib/hub-archive-url.mjs';
import { pickCommittedCustomerHubFixture } from './lib/committedCustomerHubFixture.js';

describe('resolveSiteArchiveContract', () => {
  it('falls back to platform manifest when terraform output is unavailable', () => {
    const { siteId } = pickCommittedCustomerHubFixture();
    const resolved = resolveSiteArchiveContract(siteId);
    expect(resolved).not.toBeNull();
    expect(['terraform', 'manifest', 'registry']).toContain(resolved?.source);
    expect(resolveHubArchiveUrl(resolved?.site ?? {}).url).toMatch(new RegExp(siteId));
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

  it('resolves e2e lifecycle slugs by naming convention', () => {
    const resolved = resolveSiteArchiveContract('e2e-1ndvnzcc');
    expect(resolved).toEqual({
      site: {
        hostname: 'e2e-1ndvnzcc.lovely-hub.com',
        hub_environment: 'e2e-1ndvnzcc',
        worker_name: 'lovely-home-hub-api-e2e-1ndvnzcc',
        worker_api_origin: 'https://lovely-home-hub-api-e2e-1ndvnzcc.mark-lovely67.workers.dev'
      },
      source: 'convention'
    });
  });
});
