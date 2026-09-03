import { describe, expect, it } from 'vitest';
import { resolveHubSitePagesProject } from '../scripts/lib/hub-site-pages-project.mjs';

describe('resolveHubSitePagesProject', () => {
  it('resolves the Pages project name for a site', () => {
    const resolved = resolveHubSitePagesProject('smith');
    expect(resolved.pagesProject).toBe('home-dashboard-smith');
    expect(['terraform', 'manifest', 'registry', 'default']).toContain(resolved.source);
  });

  it('uses production Pages project name for the legacy production site', () => {
    const resolved = resolveHubSitePagesProject('production');
    expect(resolved.pagesProject).toBe('home-dashboard');
  });

  it('falls back to the naming convention for unknown sites', () => {
    expect(resolveHubSitePagesProject('zzzz-nonexistent-site-id')).toEqual({
      pagesProject: 'home-dashboard-zzzz-nonexistent-site-id',
      source: 'default'
    });
  });
});
