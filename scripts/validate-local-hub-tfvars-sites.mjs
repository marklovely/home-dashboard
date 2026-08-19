#!/usr/bin/env node
/**
 * Ensure local terraform/environments/hub.tfvars lists every terraform-managed site
 * from platform/sites.yaml. Prevents accidental destroy when applying with a stale tfvars file.
 *
 * Usage: node scripts/validate-local-hub-tfvars-sites.mjs [path/to/hub.tfvars]
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tfvarsPath = process.argv[2]?.trim() || join(root, 'terraform/environments/hub.tfvars');
const registryPath = join(root, 'platform/sites.yaml');

if (!existsSync(tfvarsPath)) {
  console.error(`Missing ${tfvarsPath}`);
  console.error('Copy terraform/environments/hub.tfvars.example or generate tfvars before apply.');
  process.exit(1);
}

const registry = loadSitesYaml(registryPath);
/** @type {string[]} */
const registryTerraformSiteIds = Object.entries(registry)
  .filter(([, meta]) => meta.terraform !== false)
  .map(([siteId]) => siteId)
  .sort();

const tfvarsText = readFileSync(tfvarsPath, 'utf8');
/** @type {string[]} */
const tfvarsSiteIds = [];
for (const match of tfvarsText.matchAll(/^\s{2}([a-z][a-z0-9_-]*)\s*=\s*\{/gm)) {
  tfvarsSiteIds.push(match[1]);
}

/** @type {string[]} */
const missingInTfvars = registryTerraformSiteIds.filter((siteId) => !tfvarsSiteIds.includes(siteId));
/** @type {string[]} */
const extraInTfvars = tfvarsSiteIds.filter((siteId) => !registryTerraformSiteIds.includes(siteId));

if (missingInTfvars.length === 0 && extraInTfvars.length === 0) {
  console.log(`OK: hub.tfvars includes all ${registryTerraformSiteIds.length} terraform site(s) from sites.yaml.`);
  process.exit(0);
}

if (missingInTfvars.length > 0) {
  console.error(
    `hub.tfvars is missing site(s) still in platform/sites.yaml: ${missingInTfvars.join(', ')}`
  );
  console.error(
    'Terraform apply with this file would DESTROY those sites. Add the blocks from hub.tfvars.example or run generate-hub-tfvars for CI-style applies.'
  );
}

if (extraInTfvars.length > 0) {
  console.error(
    `hub.tfvars includes site(s) not in platform/sites.yaml: ${extraInTfvars.join(', ')}`
  );
  console.error('Remove stale blocks or restore the site in the registry before apply.');
}

process.exit(1);
