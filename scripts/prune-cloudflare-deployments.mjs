#!/usr/bin/env node
/**
 * Trim old Cloudflare Pages and Worker deployments, keeping the newest N per project/script.
 *
 * Usage:
 *   node scripts/prune-cloudflare-deployments.mjs --all
 *   node scripts/prune-cloudflare-deployments.mjs --pages lovely-home --worker lovely-home-hub-api-smith
 *   node scripts/prune-cloudflare-deployments.mjs --all-pages --keep 2 --dry-run
 *
 * Requires CLOUDFLARE_API_TOKEN. CLOUDFLARE_ACCOUNT_ID defaults to worker/wrangler.toml.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { workerNameForSite } from './lib/hub-api-pages-binding.mjs';
import { resolveHubSitePagesProjectOffline } from './lib/hub-site-pages-project.mjs';
import { listDeploySiteIds } from './deploy-all-workers.mjs';
import {
  listPagesProjectNames,
  trimPagesProjectDeployments
} from './lib/cloudflare-pages-api.mjs';
import {
  listWorkerScriptNames,
  trimWorkerScriptDeployments
} from './lib/cloudflare-workers-api.mjs';
import { isCloudflareNotFoundError } from './lib/cloudflare-sequential-delete.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const PLATFORM_PAGES = ['lovely-home', 'home-dashboard-platform'];

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {{ keep: number, dryRun: boolean, delayMs: number, pages: string[], workers: string[], all: boolean, allPages: boolean, allWorkers: boolean }} */
  const options = {
    keep: 2,
    dryRun: false,
    delayMs: 500,
    pages: [],
    workers: [],
    all: false,
    allPages: false,
    allWorkers: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--keep') {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error('--keep requires a positive number.');
      }
      options.keep = Math.floor(value);
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }
    if (arg === '--delay-ms') {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error('--delay-ms requires a non-negative number.');
      }
      options.delayMs = Math.floor(value);
      index += 1;
      continue;
    }
    if (arg === '--pages') {
      const value = argv[index + 1]?.trim();
      if (!value) throw new Error('--pages requires a project name.');
      options.pages.push(value);
      index += 1;
      continue;
    }
    if (arg === '--worker') {
      const value = argv[index + 1]?.trim();
      if (!value) throw new Error('--worker requires a script name.');
      options.workers.push(value);
      index += 1;
      continue;
    }
    if (arg === '--all') {
      options.all = true;
      continue;
    }
    if (arg === '--all-pages') {
      options.allPages = true;
      continue;
    }
    if (arg === '--all-workers') {
      options.allWorkers = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Trim old Cloudflare Pages and Worker deployments.

Keeps the newest N deployments per project/script and deletes the rest.
Active production / latest Worker deployments are skipped automatically.

Hub Pages show "Deployments paused" in the Cloudflare dashboard when git
production deploys are off (intentional — see disable-hub-pages-git-production.mjs).
That badge is NOT fixed by pruning. Deploy hubs with wrangler instead:
  bash scripts/deploy-cloudflare-pages-site.sh <site_id>
  gh workflow run deploy-hub-pages.yml

Usage:
  node scripts/prune-cloudflare-deployments.mjs [options]

Options:
  --keep <n>         Deployments to retain (default: 2)
  --delay-ms <ms>    Pause between DELETE calls (default: 500)
  --dry-run          List what would be deleted without calling DELETE
  --pages <name>     Pages project (repeatable)
  --worker <name>    Worker script (repeatable)
  --all              Hub sites from platform/sites.yaml + lovely-home + platform admin
  --all-pages        Every Pages project in the account
  --all-workers      Every Worker script in the account
  -h, --help         Show this help

Examples:
  node scripts/prune-cloudflare-deployments.mjs --all
  node scripts/prune-cloudflare-deployments.mjs --pages home-dashboard-smith --keep 2
  node scripts/prune-cloudflare-deployments.mjs --all-pages --all-workers --dry-run

Environment:
  CLOUDFLARE_API_TOKEN    Required (Account → Cloudflare Workers → Edit, Pages → Edit)
  CLOUDFLARE_ACCOUNT_ID   Optional; defaults to worker/wrangler.toml account_id

Note: scripts/prune-hub-pages-deployments.mjs deletes every deployment for deprovision.
`);
}

function defaultAccountId() {
  const fromEnv = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? '';
  if (fromEnv) return fromEnv;
  const wranglerToml = readFileSync(join(root, 'worker/wrangler.toml'), 'utf8');
  const match = wranglerToml.match(/^account_id\s*=\s*"([^"]+)"/m);
  return match?.[1]?.trim() ?? '';
}

/**
 * @returns {{ pages: string[], workers: string[] }}
 */
function discoverManagedTargets() {
  const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
  /** @type {string[]} */
  const pages = [...PLATFORM_PAGES];
  /** @type {string[]} */
  const workers = [];

  for (const siteId of Object.keys(registry)) {
    pages.push(resolveHubSitePagesProjectOffline(siteId).pagesProject);
    workers.push(workerNameForSite(siteId));
  }

  const workerPkg = JSON.parse(readFileSync(join(root, 'worker/package.json'), 'utf8'));
  for (const siteId of listDeploySiteIds(workerPkg.scripts ?? {})) {
    workers.push(workerNameForSite(siteId === 'prod' ? 'production' : siteId));
  }

  return {
    pages: uniqueSorted(pages),
    workers: uniqueSorted(workers)
  };
}

/**
 * @param {string[]} values
 */
function uniqueSorted(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );
}

/**
 * @param {string} label
 * @param {string} name
 * @param {{ total: number, deleted: number, remaining: number, failed?: number, skippedActiveProduction?: number, skippedActive?: number, dryRunDeleteIds?: string[] }} result
 */
function printResult(label, name, result) {
  const skipped =
    (result.skippedActiveProduction ?? 0) + (result.skippedActive ?? 0);
  const dryRunIds = result.dryRunDeleteIds?.length
    ? ` would delete ${result.dryRunDeleteIds.length}`
    : '';
  const failed = result.failed ? `, ${result.failed} failed` : '';
  console.log(
    `${label} ${name}: ${result.total} total, ${result.deleted} deleted, ${result.remaining} remaining${skipped ? `, ${skipped} protected skipped` : ''}${failed}${dryRunIds}`
  );
}

const cli = parseArgs(process.argv.slice(2));
if (
  !cli.all &&
  !cli.allPages &&
  !cli.allWorkers &&
  cli.pages.length === 0 &&
  cli.workers.length === 0
) {
  printHelp();
  process.exit(1);
}

const accountId = defaultAccountId();
const token = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? '';
if (!accountId || !token) {
  console.error('CLOUDFLARE_API_TOKEN is required (and CLOUDFLARE_ACCOUNT_ID if not in wrangler.toml).');
  process.exit(1);
}

/** @type {string[]} */
let pagesTargets = [...cli.pages];
/** @type {string[]} */
let workerTargets = [...cli.workers];

if (cli.all) {
  const managed = discoverManagedTargets();
  pagesTargets.push(...managed.pages);
  workerTargets.push(...managed.workers);
}

if (cli.allPages) {
  const names = await listPagesProjectNames(accountId, token, {
    onProgress: (message) => console.log(message)
  });
  pagesTargets.push(...names);
}

if (cli.allWorkers) {
  const names = await listWorkerScriptNames(accountId, token, {
    onProgress: (message) => console.log(message)
  });
  workerTargets.push(...names);
}

pagesTargets = uniqueSorted(pagesTargets);
workerTargets = uniqueSorted(workerTargets);

console.log(
  `Pruning Cloudflare deployments (keep=${cli.keep}, delay=${cli.delayMs}ms${cli.dryRun ? ', dry-run' : ''})`
);
if (pagesTargets.length) {
  console.log(`Pages: ${pagesTargets.join(', ')}`);
}
if (workerTargets.length) {
  console.log(`Workers: ${workerTargets.join(', ')}`);
}

let hadError = false;

for (const projectName of pagesTargets) {
  try {
    const result = await trimPagesProjectDeployments(projectName, {
      accountId,
      token,
      keep: cli.keep,
      dryRun: cli.dryRun,
      delayMs: cli.delayMs,
      onProgress: (message) => console.log(message)
    });
    printResult('Pages', projectName, result);
  } catch (error) {
    if (isCloudflareNotFoundError(error)) {
      console.log(`Pages ${projectName}: skipped (project not found)`);
      continue;
    }
    hadError = true;
    console.error(
      `Pages ${projectName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

for (const scriptName of workerTargets) {
  try {
    const result = await trimWorkerScriptDeployments(scriptName, {
      accountId,
      token,
      keep: cli.keep,
      dryRun: cli.dryRun,
      delayMs: cli.delayMs,
      onProgress: (message) => console.log(message)
    });
    printResult('Worker', scriptName, result);
  } catch (error) {
    if (isCloudflareNotFoundError(error)) {
      console.log(`Worker ${scriptName}: skipped (script not found)`);
      continue;
    }
    hadError = true;
    console.error(
      `Worker ${scriptName}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

if (hadError) {
  process.exit(1);
}
