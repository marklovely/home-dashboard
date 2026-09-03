import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultHubSiteR2BucketNames } from '../scripts/lib/hub-site-r2-buckets.mjs';

describe('hub site R2 bucket names', () => {
  afterEach(() => {
    vi.resetModules();
  });

  it('uses site-scoped bucket names for customer hubs', () => {
    expect(defaultHubSiteR2BucketNames('smith')).toEqual({
      guides: 'lovely-home-appliance-guides-smith',
      media: 'lovely-home-guide-media-smith'
    });
  });

  it('falls back to manifest bucket names when terraform output is unavailable', async () => {
    vi.doMock('../scripts/lib/resolve-site-archive-contract.mjs', () => ({
      resolveSiteArchiveContract: vi.fn(() => ({
        site: {
          r2_guides_bucket: 'lovely-home-appliance-guides-smith',
          r2_media_bucket: 'lovely-home-guide-media-smith'
        },
        source: 'manifest'
      }))
    }));

    const { resolveHubSiteR2BucketNames } = await import('../scripts/lib/hub-site-r2-buckets.mjs');
    const resolved = resolveHubSiteR2BucketNames('smith');
    expect(resolved.source).toBe('manifest');
    expect(resolved.guides).toBe('lovely-home-appliance-guides-smith');
    expect(resolved.media).toBe('lovely-home-guide-media-smith');
  });
});
