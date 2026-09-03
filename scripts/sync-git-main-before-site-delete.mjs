#!/usr/bin/env node
/**
 * CI helper: move the checkout to origin/main (and wait until the site's
 * provision follow-up has landed) before deleting it from the registry.
 *
 * Usage:
 *   node scripts/sync-git-main-before-site-delete.mjs <site_id>
 */
import { appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { registryDeleteSyncState } from './lib/registry-delete-sync.mjs';
import { gitResetToOriginMain } from './lib/git-reset-origin-main.mjs';

const siteId = String(process.argv[2] ?? '').trim();
if (!siteId) {
  console.error('Usage: node scripts/sync-git-main-before-site-delete.mjs <site_id>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPath = join(root, 'platform/sites.yaml');
const maxAttempts = Math.max(1, Number(process.env.SYNC_MAIN_MAX_ATTEMPTS || 18));
const sleepSec = Math.max(1, Number(process.env.SYNC_MAIN_SLEEP_SEC || 20));

/**
 * @param {string} name
 * @param {string} value
 */
function writeOutput(name, value) {
  const file = process.env.GITHUB_OUTPUT;
  if (!file) return;
  appendFileSync(file, `${name}=${value}\n`);
}

function fetchMainAndReset() {
  gitResetToOriginMain({
    cwd: root,
    token: process.env.PLATFORM_GITHUB_TOKEN || process.env.GH_TOKEN,
    repository: process.env.GITHUB_REPOSITORY
  });
}

for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
  fetchMainAndReset();
  const entry = loadSitesYaml(yamlPath)[siteId];
  const state = registryDeleteSyncState(entry);

  if (state === 'absent') {
    console.log(`Site ${siteId} is already absent from origin/main.`);
    writeOutput('site_present', 'false');
    process.exit(0);
  }

  if (state === 'ready') {
    console.log(`Site ${siteId} is current on origin/main; safe to delete from the registry.`);
    writeOutput('site_present', 'true');
    process.exit(0);
  }

  if (attempt === maxAttempts) {
    console.log(
      `Timed out waiting for attach_hub_api_binding on ${siteId}; deleting the current registry row.`
    );
    writeOutput('site_present', 'true');
    process.exit(0);
  }

  console.log(
    `Waiting for provision follow-up for ${siteId} (${attempt}/${maxAttempts}); sleeping ${sleepSec}s.`
  );
  execFileSync('sleep', [String(sleepSec)], { stdio: 'inherit' });
}
