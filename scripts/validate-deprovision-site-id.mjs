#!/usr/bin/env node
/**
 * Validate site_id before hub site deprovision in GitHub Actions.
 * Exits 0 and prints site id to GITHUB_OUTPUT when valid.
 */
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateDeprovisionSiteId } from './lib/site-registry.mjs';

const siteId = String(process.env.SITE_ID ?? '').trim();
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));

const deprovisionError = validateDeprovisionSiteId(siteId, registry);
if (deprovisionError) {
  console.error(deprovisionError);
  process.exit(1);
}

const tfDir = join(root, 'terraform');
let inState = false;
try {
  const stateList = execFileSync('terraform', ['state', 'list'], {
    cwd: tfDir,
    encoding: 'utf8'
  });
  inState = stateList
    .split('\n')
    .some((line) => line.trim() === `module.hub_site[${JSON.stringify(siteId)}]`);
} catch {
  inState = false;
}

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `site_id=${siteId}\n`);
  appendFileSync(githubOutput, `terraform_in_state=${inState ? 'true' : 'false'}\n`);
}

if (!inState) {
  console.log(`Validated deprovision site_id=${siteId} (no terraform module in state — worker/manifest cleanup only).`);
} else {
  console.log(`Validated deprovision site_id=${siteId} (terraform module in state).`);
}
