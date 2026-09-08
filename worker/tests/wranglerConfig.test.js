import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { loadSitesYaml } from '../../scripts/lib/load-sites-yaml.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const wranglerToml = readFileSync(join(root, 'worker/wrangler.toml'), 'utf8');
const sites = loadSitesYaml(join(root, 'platform/sites.yaml'));

/**
 * @param {string} siteId
 */
function escapeRegExp(siteId) {
  return siteId.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}

describe('wrangler.toml environments', () => {
  it('defines a wrangler env for every terraform site in the registry', () => {
    const terraformSites = Object.entries(sites).filter(([, entry]) => entry.terraform !== false);
    expect(terraformSites.length).toBeGreaterThan(0);

    for (const [siteId] of terraformSites) {
      const env = escapeRegExp(siteId);
      expect(wranglerToml, siteId).toMatch(new RegExp(`\\[env\\.${env}\\]`));
      expect(wranglerToml, siteId).toMatch(
        new RegExp(`name = "lovely-home-hub-api-${escapeRegExp(siteId)}"`)
      );
    }
  });

  it('uses site-scoped D1 and R2 resource names for terraform hubs', () => {
    for (const [siteId, entry] of Object.entries(sites)) {
      if (entry.terraform === false) continue;
      expect(wranglerToml, siteId).toMatch(new RegExp(`lovely-home-appliance-manuals-${escapeRegExp(siteId)}`));
      expect(wranglerToml, siteId).toMatch(new RegExp(`lovely-home-appliance-guides-${escapeRegExp(siteId)}`));
      expect(wranglerToml, siteId).toMatch(new RegExp(`lovely-home-guide-media-${escapeRegExp(siteId)}`));
    }
    expect(wranglerToml).toMatch(/binding = "BRAND_MEDIA"/);
    expect(wranglerToml).toMatch(/bucket_name = "lovely-home-media"/);
  });

  it('keeps production D1 id separate from per-site database ids', () => {
    expect(wranglerToml).toMatch(/database_id = "6ba7c54d-8804-47c0-8648-77b1aa25e0e0"/);
    expect(wranglerToml).toMatch(/database_id = "[0-9a-f-]{36}"/);
  });
});
