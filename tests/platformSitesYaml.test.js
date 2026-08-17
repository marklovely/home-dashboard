import { describe, expect, it } from 'vitest';
import { loadSitesYaml } from '../scripts/lib/load-sites-yaml.mjs';
import { join } from 'node:path';

describe('loadSitesYaml', () => {
  it('loads platform/sites.yaml registry', () => {
    const sites = loadSitesYaml(join(process.cwd(), 'platform/sites.yaml'));
    expect(sites.production.hostname).toBe('dashboard.lovely-home.co.uk');
    expect(sites.test.terraform).toBe(true);
    expect(sites.sandbox.vanilla).toBe(true);
  });
});
