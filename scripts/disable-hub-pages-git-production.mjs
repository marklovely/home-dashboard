#!/usr/bin/env node
/**
 * Turn off Cloudflare git production deploys for hub Pages projects.
 * Provision already wrangler-deploys the hub; registry merges must not
 * rebuild every household and starve platform Pages.
 *
 * Usage: node scripts/disable-hub-pages-git-production.mjs [site_id...]
 *   With no args, updates every terraform site in platform/sites.yaml.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { pagesProjectNameForSite } from './lib/hub-api-pages-binding.mjs';
import { setPagesGitProductionEnabled } from './lib/pages-preview.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const requested = process.argv.slice(2).map((arg) => arg.trim()).filter(Boolean);
const failOnError = requested.length > 0;
const siteIds =
  requested.length > 0
    ? requested
    : Object.entries(registry)
        .filter(([, meta]) => meta.terraform !== false)
        .map(([siteId]) => siteId);

for (const siteId of siteIds) {
  const siteError = validateSiteId(siteId);
  if (siteError) {
    console.error(siteError);
    process.exit(1);
  }
  if (registry[siteId]?.terraform === false) {
    console.error(`Site "${siteId}" is not terraform-managed.`);
    process.exit(1);
  }
}

let failed = 0;
for (const siteId of siteIds) {
  const pagesProject = pagesProjectNameForSite(siteId);
  try {
    const result = await setPagesGitProductionEnabled(accountId, token, pagesProject, false);
    console.log(`Git production deploys disabled on ${result.pagesProject} (${siteId})`);
  } catch (error) {
    failed += 1;
    const detail = error instanceof Error ? error.message : String(error);
    if (failOnError) {
      console.error(`Failed to disable git production deploys for ${siteId}: ${detail}`);
      process.exit(1);
    }
    console.warn(`Skipping ${siteId} (${pagesProject}): ${detail}`);
  }
}

if (failed > 0) {
  console.warn(`Disabled git production deploys where possible (${failed} site(s) skipped).`);
} else {
  console.log(`Git production deploys disabled for: ${siteIds.join(', ')}`);
}
