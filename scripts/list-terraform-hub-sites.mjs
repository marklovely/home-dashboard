#!/usr/bin/env node
/**
 * List terraform-managed hub site ids for a GitHub Actions matrix.
 */
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const siteIds = Object.entries(registry)
  .filter(([, meta]) => meta.terraform !== false)
  .map(([siteId]) => siteId);

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `site_ids=${JSON.stringify(siteIds)}\n`);
}

console.log(siteIds.length ? siteIds.join(', ') : '(none)');
