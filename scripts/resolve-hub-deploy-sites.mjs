#!/usr/bin/env node
/**
 * Resolve site ids for hub Pages CD (GitHub Actions matrix input).
 *
 * Usage:
 *   node scripts/resolve-hub-deploy-sites.mjs all
 *   node scripts/resolve-hub-deploy-sites.mjs demo,larchmount
 */
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} selection
 * @param {Record<string, { terraform?: boolean }>} registry
 * @returns {string[]}
 */
export function resolveHubDeploySites(selection, registry) {
  const terraformSites = Object.entries(registry)
    .filter(([, meta]) => meta.terraform !== false)
    .map(([siteId]) => siteId);

  const raw = String(selection ?? '').trim();
  if (!raw || raw.toLowerCase() === 'all') {
    return terraformSites;
  }

  const requested = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    throw new Error('No site ids provided.');
  }

  /** @type {string[]} */
  const siteIds = [];
  for (const siteId of requested) {
    const error = validateSiteId(siteId);
    if (error) {
      throw new Error(error);
    }
    if (!registry[siteId]) {
      throw new Error(`Unknown site "${siteId}" — not in platform/sites.yaml.`);
    }
    if (registry[siteId].terraform === false) {
      throw new Error(`Site "${siteId}" is not terraform-managed.`);
    }
    siteIds.push(siteId);
  }

  return siteIds;
}

function main() {
  const selection = process.argv[2]?.trim() ?? 'all';
  const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
  const siteIds = resolveHubDeploySites(selection, registry);
  const githubOutput = process.env.GITHUB_OUTPUT;
  if (githubOutput) {
    appendFileSync(githubOutput, `site_ids=${JSON.stringify(siteIds)}\n`);
  }
  console.log(siteIds.length ? siteIds.join(', ') : '(none)');
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
