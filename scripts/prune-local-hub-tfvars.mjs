#!/usr/bin/env node
/**
 * Remove a site block from local terraform/environments/hub.tfvars when present.
 *
 * Usage: node scripts/prune-local-hub-tfvars.mjs <site_id>
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { removeHubTfvarsSiteBlock } from './lib/prune-hub-site-config.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/prune-local-hub-tfvars.mjs <site_id>');
  process.exit(1);
}

const idError = validateSiteId(siteId);
if (idError) {
  console.error(idError);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hubTfvarsPath = join(root, 'terraform/environments/hub.tfvars');

if (!existsSync(hubTfvarsPath)) {
  console.log('No local terraform/environments/hub.tfvars — nothing to prune.');
  process.exit(0);
}

const current = readFileSync(hubTfvarsPath, 'utf8');
const { text, changed } = removeHubTfvarsSiteBlock(current, siteId);
if (!changed) {
  console.log(`Site "${siteId}" was not present in hub.tfvars.`);
  process.exit(0);
}

writeFileSync(hubTfvarsPath, text);
console.log(`Removed site "${siteId}" from terraform/environments/hub.tfvars.`);
