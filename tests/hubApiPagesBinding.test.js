import { describe, expect, it } from 'vitest';
import {
  pagesProjectNameForSite,
  productionHubApiMissing,
  productionHubApiService,
  workerNameForSite
} from '../scripts/lib/hub-api-pages-binding.mjs';

describe('hub API Pages binding helpers', () => {
  it('uses the legacy production Pages and Worker names', () => {
    expect(pagesProjectNameForSite('production')).toBe('home-dashboard');
    expect(workerNameForSite('production')).toBe('lovely-home-hub-api');
    expect(pagesProjectNameForSite('sandbox')).toBe('home-dashboard-sandbox');
    expect(workerNameForSite('sandbox')).toBe('lovely-home-hub-api-sandbox');
  });

  it('allows production in attach-hub-api-pages-binding (worker deploy guard is separate)', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const script = readFileSync(join(process.cwd(), 'scripts/attach-hub-api-pages-binding.mjs'), 'utf8');
    expect(script).toContain('validateSiteId');
    expect(script).not.toContain('validateDeploySiteId');
    expect(script).toContain("siteId === 'production'");
    expect(script).toContain('workerNameForSite');
  });

  it('detects a missing or wrong production HUB_API binding', () => {
    expect(productionHubApiService({})).toBe('');
    expect(
      productionHubApiMissing(
        { deployment_configs: { production: { services: {} }, preview: { services: { HUB_API: { service: 'lovely-home-hub-api-sandbox' } } } } },
        'lovely-home-hub-api-sandbox'
      )
    ).toBe(true);
    expect(
      productionHubApiMissing(
        { deployment_configs: { production: { services: { HUB_API: { service: 'lovely-home-hub-api-sandbox' } } } } },
        'lovely-home-hub-api-sandbox'
      )
    ).toBe(false);
  });
});
