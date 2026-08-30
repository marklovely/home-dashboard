import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadSitesYaml } from '../scripts/lib/load-sites-yaml.mjs';
import { join } from 'node:path';

describe('loadSitesYaml', () => {
  it('loads platform/sites.yaml registry', () => {
    const sites = loadSitesYaml(join(process.cwd(), 'platform/sites.yaml'));
    expect(sites.production.hostname).toBe('dashboard.lovely-home.co.uk');
    expect(sites.test.terraform).toBe(true);
    expect(sites.sandbox.vanilla).toBe(true);
  });

  it('parses comma-separated owner and sitter emails', () => {
    const sites = loadSitesYaml(join(process.cwd(), 'tests/fixtures/sites-with-emails.yaml'));
    expect(sites.demo.owner_emails).toEqual(['owner@example.com', 'partner@example.com']);
    expect(sites.demo.sitter_emails).toEqual(['sitter@example.com']);
  });

  it('requires worker deploy scripts for every terraform site in the registry', () => {
    const sites = loadSitesYaml(join(process.cwd(), 'platform/sites.yaml'));
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'worker/package.json'), 'utf8'));
    const scripts = pkg.scripts ?? {};
    const wrangler = readFileSync(join(process.cwd(), 'worker/wrangler.toml'), 'utf8');

    for (const [siteId, entry] of Object.entries(sites)) {
      if (siteId === 'production' || !entry.terraform) continue;
      expect(scripts[`deploy:${siteId}`], `deploy:${siteId}`).toBeTruthy();
      expect(scripts[`d1:migrate:${siteId}`], `d1:migrate:${siteId}`).toBeTruthy();
      expect(wrangler, siteId).toContain(`[env.${siteId}]`);
    }
  });
});
