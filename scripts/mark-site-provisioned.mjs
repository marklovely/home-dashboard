#!/usr/bin/env node
/**
 * Mark a site as fully provisioned in platform/sites.yaml (attach_hub_api_binding: true).
 * Usage: node scripts/mark-site-provisioned.mjs <site_id>
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateSiteId } from './lib/site-registry.mjs';
import { formatSitesYaml } from './lib/write-sites-yaml.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/mark-site-provisioned.mjs <site_id>');
  process.exit(1);
}

const idError = validateSiteId(siteId);
if (idError) {
  console.error(idError);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPath = join(root, 'platform/sites.yaml');
const sites = loadSitesYaml(yamlPath);

if (!sites[siteId]) {
  console.error(`Site "${siteId}" is not in platform/sites.yaml.`);
  process.exit(1);
}

sites[siteId] = {
  ...sites[siteId],
  attach_hub_api_binding: true
};

writeFileSync(yamlPath, formatSitesYaml(sites));
console.log(`Marked ${siteId} attach_hub_api_binding=true in platform/sites.yaml`);
