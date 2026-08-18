#!/usr/bin/env node
/**
 * Validate site_id before hub site deprovision in GitHub Actions.
 * Exits 0 and prints site id to GITHUB_OUTPUT when valid.
 */
import { appendFileSync } from 'node:fs';
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

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `site_id=${siteId}\n`);
}

console.log(`Validated deprovision site_id=${siteId}`);
