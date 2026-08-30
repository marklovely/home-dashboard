#!/usr/bin/env node
/**
 * Push GOOGLE_PLACES_API_KEY to every hub Worker (or selected sites).
 *
 * Usage (from repo root):
 *   export GOOGLE_PLACES_API_KEY='…'
 *   node scripts/sync-google-places-api-key.mjs
 *   node scripts/sync-google-places-api-key.mjs --site practice --site smith
 *   node scripts/sync-google-places-api-key.mjs --dry-run
 *
 * Requires CLOUDFLARE_API_TOKEN with Workers Scripts Edit (same as wrangler secret put).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { putWorkerSecret, wranglerEnvFromDeploySiteId } from './lib/worker-secret-put.mjs';
import {
  parseSyncArchiveSecretArgs,
  resolveSyncArchiveSecretTargets
} from './sync-platform-site-archive-secret.mjs';

const SECRET_NAME = 'GOOGLE_PLACES_API_KEY';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerPkgPath = join(root, 'worker/package.json');

function printHelp() {
  console.log(`Sync GOOGLE_PLACES_API_KEY to hub Workers (UK address autocomplete in setup wizard).

Usage:
  node scripts/sync-google-places-api-key.mjs [options]

Options:
  --dry-run           Print targets without calling wrangler
  --site <id>         Only this site (repeatable; prod = default Worker)
  --exclude <id>      Skip a site (repeatable)
  --continue          Keep going if one site fails
  -h, --help          Show this help

Environment:
  GOOGLE_PLACES_API_KEY   Required — same value as GitHub repo secret
  CLOUDFLARE_API_TOKEN    Required for wrangler secret put
  CLOUDFLARE_ACCOUNT_ID   Usually required by wrangler

Also applied automatically on provision when the repo secret is set.
`);
}

/**
 * @param {string} siteId deploy script id (prod, test, …)
 * @param {string} secretValue
 * @param {boolean} dryRun
 */
function syncSite(siteId, secretValue, dryRun) {
  const wranglerEnv = wranglerEnvFromDeploySiteId(siteId);
  const envLabel = wranglerEnv ?? 'default';
  console.log(`\n=== ${siteId} (wrangler ${envLabel}) ===`);
  putWorkerSecret(wranglerEnv, SECRET_NAME, secretValue, { dryRun });
  return { ok: true, siteId };
}

function main() {
  let options;
  try {
    options = parseSyncArchiveSecretArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printHelp();
    process.exit(1);
  }

  if (options.help) {
    printHelp();
    process.exit(0);
  }

  const secretValue = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!secretValue && !options.dryRun) {
    console.error(
      'GOOGLE_PLACES_API_KEY is not set. Export the same value as the GitHub repo secret, or use --dry-run.'
    );
    process.exit(1);
  }

  const workerPkg = JSON.parse(readFileSync(workerPkgPath, 'utf8'));
  let targets;
  try {
    targets = resolveSyncArchiveSecretTargets(workerPkg.scripts ?? {}, {
      sites: options.sites,
      exclude: options.exclude
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  if (targets.length === 0) {
    console.error('No sites selected.');
    process.exit(1);
  }

  if (!process.env.CLOUDFLARE_API_TOKEN && !options.dryRun) {
    console.error('CLOUDFLARE_API_TOKEN is not set.');
    process.exit(1);
  }

  console.log(
    `${options.dryRun ? 'Would sync' : 'Syncing'} ${SECRET_NAME} to ${targets.length} Worker(s): ${targets.join(', ')}`
  );

  /** @type {Array<{ ok: boolean, siteId: string }>} */
  const results = [];
  for (const siteId of targets) {
    try {
      results.push(syncSite(siteId, secretValue ?? '(dry-run)', options.dryRun));
    } catch (error) {
      console.error(
        `Failed for site "${siteId}": ${error instanceof Error ? error.message : String(error)}`
      );
      results.push({ ok: false, siteId });
      if (!options.continueOnError) break;
    }
  }

  const failed = results.filter((result) => !result.ok);
  console.log('\n--- Summary ---');
  for (const result of results) {
    console.log(`${result.ok ? 'OK' : 'FAIL'}  ${result.siteId}`);
  }

  if (failed.length > 0) {
    process.exit(1);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
