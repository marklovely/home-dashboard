#!/usr/bin/env node
/**
 * Deploy every hub Worker that has a deploy script in worker/package.json.
 *
 * Usage (from repo root):
 *   node scripts/deploy-all-workers.mjs
 *   node scripts/deploy-all-workers.mjs --dry-run
 *   node scripts/deploy-all-workers.mjs --site test --site demo
 *   node scripts/deploy-all-workers.mjs --exclude prod
 *
 * Requires CLOUDFLARE_API_TOKEN (and usually CLOUDFLARE_ACCOUNT_ID) in the
 * environment — same as individual `npm run deploy:<site> --prefix worker`.
 *
 * Single site (examples):
 *   npm run deploy:test --prefix worker
 *   npm run deploy:smith --prefix worker
 *   npm run deploy --prefix worker          # production / default Worker
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerPkgPath = join(root, 'worker/package.json');

/**
 * @param {Record<string, string>} scripts
 * @returns {string[]}
 */
export function listDeploySiteIds(scripts) {
  /** @type {string[]} */
  const siteIds = Object.keys(scripts)
    .filter((key) => key.startsWith('deploy:') && key !== 'deploy:all')
    .map((key) => key.slice('deploy:'.length));

  if (typeof scripts.deploy === 'string' && scripts.deploy.trim()) {
    siteIds.push('prod');
  }

  return [...new Set(siteIds)].sort((a, b) => {
    if (a === 'prod') return -1;
    if (b === 'prod') return 1;
    return a.localeCompare(b);
  });
}

/**
 * @param {string} siteId
 * @returns {string}
 */
export function deployScriptNameForSite(siteId) {
  return siteId === 'prod' ? 'deploy' : `deploy:${siteId}`;
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
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
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`Deploy all hub Workers.

Usage:
  node scripts/deploy-all-workers.mjs [options]

Options:
  --dry-run           Print commands without running wrangler
  --site <id>         Only deploy this site (repeatable; prod = default Worker)
  --exclude <id>      Skip a site (repeatable; e.g. prod)
  --continue          Keep going if one site fails
  -h, --help          Show this help

Environment:
  CLOUDFLARE_API_TOKEN   Required for wrangler deploy
  CLOUDFLARE_ACCOUNT_ID  Usually required by wrangler

Tip: run migrations first with npm run d1:migrate:all
`);
}

/**
 * @param {string} siteId
 * @param {boolean} dryRun
 * @returns {{ ok: boolean, siteId: string, code: number | null }}
 */
function deploySite(siteId, dryRun) {
  const script = deployScriptNameForSite(siteId);
  console.log(`\n=== ${siteId} ===`);
  if (dryRun) {
    console.log(`npm run ${script} --prefix worker`);
    return { ok: true, siteId, code: 0 };
  }

  const result = spawnSync('npm', ['run', script, '--prefix', 'worker'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env
  });

  const ok = result.status === 0;
  if (!ok) {
    console.error(`Deploy failed for site "${siteId}" (exit ${result.status ?? 'unknown'}).`);
  }
  return { ok, siteId, code: result.status ?? 1 };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printHelp();
    process.exit(1);
  }

  const workerPkg = JSON.parse(readFileSync(workerPkgPath, 'utf8'));
  const available = listDeploySiteIds(workerPkg.scripts ?? {});

  if (available.length === 0) {
    console.error('No deploy scripts found in worker/package.json.');
    process.exit(1);
  }

  let targets =
    options.sites.length > 0
      ? options.sites
      : available.filter((siteId) => !options.exclude.has(siteId));

  for (const siteId of targets) {
    if (!available.includes(siteId)) {
      console.error(`Unknown site "${siteId}". Available: ${available.join(', ')}`);
      process.exit(1);
    }
  }

  targets = [...new Set(targets)];

  if (targets.length === 0) {
    console.error('No sites selected to deploy.');
    process.exit(1);
  }

  if (!process.env.CLOUDFLARE_API_TOKEN && !options.dryRun) {
    console.error(
      'CLOUDFLARE_API_TOKEN is not set. Export your Cloudflare API token first, or use --dry-run.'
    );
    process.exit(1);
  }

  console.log(
    `${options.dryRun ? 'Would deploy' : 'Deploying'} Workers for ${targets.length} site(s): ${targets.join(', ')}`
  );

  /** @type {Array<{ ok: boolean, siteId: string, code: number | null }>} */
  const results = [];
  for (const siteId of targets) {
    const result = deploySite(siteId, options.dryRun);
    results.push(result);
    if (!result.ok && !options.continueOnError) {
      break;
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
