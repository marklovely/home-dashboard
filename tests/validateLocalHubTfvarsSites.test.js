import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadSitesYaml } from '../scripts/lib/load-sites-yaml.mjs';

const sitesYamlPath = join(process.cwd(), 'platform/sites.yaml');
const validateScriptPath = join(process.cwd(), 'scripts/validate-local-hub-tfvars-sites.mjs');

/**
 * @param {[string, Record<string, unknown>][]} siteEntries
 */
function buildTfvarsForSites(siteEntries) {
  const blocks = siteEntries.map(([siteId, meta]) => {
    const hostname = meta.hostname;
    return `  ${siteId} = { hostname = "${hostname}" }`;
  });
  return `sites = {\n${blocks.join('\n')}\n}\n`;
}

/**
 * @param {string} tfvarsPath
 */
function runValidator(tfvarsPath) {
  return spawnSync(process.execPath, [validateScriptPath, tfvarsPath], {
    encoding: 'utf8',
    env: { ...process.env }
  });
}

describe('validate-local-hub-tfvars-sites', () => {
  it('passes when hub.tfvars includes every terraform site from sites.yaml', () => {
    const registry = loadSitesYaml(sitesYamlPath);
    const terraformSites = Object.entries(registry).filter(([, meta]) => meta.terraform !== false);

    const dir = mkdtempSync(join(tmpdir(), 'hub-tfvars-'));
    const tfvarsPath = join(dir, 'hub.tfvars');
    writeFileSync(tfvarsPath, buildTfvarsForSites(terraformSites));

    const result = runValidator(tfvarsPath);

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/OK:/);
  });

  it('fails when a registry site is missing from hub.tfvars', () => {
    const registry = loadSitesYaml(sitesYamlPath);
    const terraformSites = Object.entries(registry).filter(([, meta]) => meta.terraform !== false);
    expect(terraformSites.length).toBeGreaterThan(0);

    const omittedSiteId = terraformSites[terraformSites.length - 1][0];
    const included = terraformSites.filter(([siteId]) => siteId !== omittedSiteId);

    const dir = mkdtempSync(join(tmpdir(), 'hub-tfvars-'));
    const tfvarsPath = join(dir, 'hub.tfvars');
    writeFileSync(tfvarsPath, buildTfvarsForSites(included));

    const result = runValidator(tfvarsPath);

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(new RegExp(`missing site\\(s\\).*${omittedSiteId}`, 'i'));
    expect(result.stderr).toMatch(/DESTROY/i);
  });
});
