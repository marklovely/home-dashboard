#!/usr/bin/env node
/**
 * Push PLATFORM_SITE_ARCHIVE_SECRET to every hub Worker (or selected sites).
 *
 * Usage (from repo root):
 *   export PLATFORM_SITE_ARCHIVE_SECRET='…'
 *   node scripts/sync-platform-site-archive-secret.mjs
 *   node scripts/sync-platform-site-archive-secret.mjs --site smith --site test
 *   node scripts/sync-platform-site-archive-secret.mjs --dry-run
 *
 * Requires CLOUDFLARE_API_TOKEN with Workers Scripts Edit (same as wrangler secret put).
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listDeploySiteIds } from './deploy-all-workers.mjs';
import { putWorkerSecret, wranglerEnvFromDeploySiteId } from './lib/worker-secret-put.mjs';

const SECRET_NAME = 'PLATFORM_SITE_ARCHIVE_SECRET';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerPkgPath = join(root, 'worker/package.json');

/**
 * @param {string[]} argv
 */
export function parseSyncArchiveSecretArgs(argv) {
  /** @type {{ dryRun: boolean, continueOnError: boolean, sites: string[], exclude: Set<string> }} */
  const options = {
    dryRun: false,
    continueOnError: false,
    sites: [],
    exclude: new Set()
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--continue') {
      options.continueOnError = true;
      continue;
    }
    if (arg === '--site') {
      const value = argv[i + 1]?.trim();
      if (!value) throw new Error('--site requires a site id.');
      options.sites.push(value);
      i += 1;
      continue;
    }
    if (arg === '--exclude') {
      const value = argv[i + 1]?.trim();
      if (!value) throw new Error('--exclude requires a site id.');
      options.exclude.add(value);
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      return { ...options, help: true };
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

/**
 * @param {Record<string, string>} scripts
 * @param {{ sites?: string[], exclude?: Set<string> }} filter
 * @returns {string[]}
 */
export function resolveSyncArchiveSecretTargets(scripts, filter = {}) {
  const available = listDeploySiteIds(scripts);
  const sites = filter.sites ?? [];
  const exclude = filter.exclude ?? new Set();

  let targets =
    sites.length > 0
      ? sites.map(normaliseDeploySiteId)
      : available.filter((siteId) => !exclude.has(siteId));

  for (const siteId of targets) {
    if (!available.includes(siteId)) {
      throw new Error(`Unknown site "${siteId}". Available: ${available.join(', ')}`);
    }
  }

  return [...new Set(targets)];
}

/**
 * Normalise workflow/CLI site id to deploy script id.
 * @param {string} siteId
 * @returns {string}
 */
export function normaliseDeploySiteId(siteId) {
  const id = String(siteId ?? '').trim();
  if (id === 'production') return 'prod';
  return id;
}

function printHelp() {
  console.log(`Sync PLATFORM_SITE_ARCHIVE_SECRET to hub Workers.

Usage:
  node scripts/sync-platform-site-archive-secret.mjs [options]

Options:
  --dry-run           Print targets without calling wrangler
  --site <id>         Only this site (repeatable; prod = default Worker)
  --exclude <id>      Skip a site (repeatable)
  --continue          Keep going if one site fails
  -h, --help          Show this help

Environment:
  PLATFORM_SITE_ARCHIVE_SECRET   Required — same value as GitHub repo secret
  CLOUDFLARE_API_TOKEN           Required for wrangler secret put
  CLOUDFLARE_ACCOUNT_ID          Usually required by wrangler

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

  const secretValue = process.env.PLATFORM_SITE_ARCHIVE_SECRET?.trim();
  if (!secretValue && !options.dryRun) {
    console.error(
      'PLATFORM_SITE_ARCHIVE_SECRET is not set. Export the same value as the GitHub repo secret, or use --dry-run.'
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
