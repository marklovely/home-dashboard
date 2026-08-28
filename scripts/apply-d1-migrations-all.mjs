#!/usr/bin/env node
/**
 * Apply pending D1 migrations to every hub Worker database that has a
 * `d1:migrate:<site>` script in worker/package.json.
 *
 * Usage (from repo root):
 *   node scripts/apply-d1-migrations-all.mjs
 *   node scripts/apply-d1-migrations-all.mjs --dry-run
 *   node scripts/apply-d1-migrations-all.mjs --site test --site demo
 *   node scripts/apply-d1-migrations-all.mjs --exclude prod
 *
 * Requires CLOUDFLARE_API_TOKEN (and usually CLOUDFLARE_ACCOUNT_ID) in the
 * environment — same as individual `npm run d1:migrate:<site> --prefix worker`.
 *
 * Single site (examples):
 *   npm run d1:migrate:test --prefix worker
 *   npm run d1:migrate:smith --prefix worker
 *   npm run d1:migrate:prod --prefix worker
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
export function listD1MigrateSiteIds(scripts) {
  return Object.keys(scripts)
    .filter((key) => key.startsWith('d1:migrate:'))
    .map((key) => key.slice('d1:migrate:'.length))
    .filter((siteId) => siteId !== 'all')
    .sort((a, b) => {
      if (a === 'prod') return -1;
      if (b === 'prod') return 1;
      return a.localeCompare(b);
    });
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
  console.log(`Apply D1 migrations to all hub Worker databases.

Usage:
  node scripts/apply-d1-migrations-all.mjs [options]

Options:
  --dry-run           Print commands without running wrangler
  --site <id>         Only migrate this site (repeatable)
  --exclude <id>      Skip a site (repeatable; e.g. prod)
  --continue          Keep going if one site fails
  -h, --help          Show this help

Environment:
  CLOUDFLARE_API_TOKEN   Required for remote D1 migrations
  CLOUDFLARE_ACCOUNT_ID  Usually required by wrangler
`);
}

/**
 * @param {string} siteId
 * @param {boolean} dryRun
 * @returns {{ ok: boolean, siteId: string, code: number | null }}
 */
function migrateSite(siteId, dryRun) {
  const script = `d1:migrate:${siteId}`;
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
    console.error(`Migration failed for site "${siteId}" (exit ${result.status ?? 'unknown'}).`);
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
  const available = listD1MigrateSiteIds(workerPkg.scripts ?? {});

  if (available.length === 0) {
    console.error('No d1:migrate:* scripts found in worker/package.json.');
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
    console.error('No sites selected to migrate.');
    process.exit(1);
  }

  if (!process.env.CLOUDFLARE_API_TOKEN && !options.dryRun) {
    console.error(
      'CLOUDFLARE_API_TOKEN is not set. Export your Cloudflare API token first, or use --dry-run.'
    );
    process.exit(1);
  }

  console.log(
    `${options.dryRun ? 'Would migrate' : 'Migrating'} D1 for ${targets.length} site(s): ${targets.join(', ')}`
  );

  /** @type {Array<{ ok: boolean, siteId: string, code: number | null }>} */
  const results = [];
  for (const siteId of targets) {
    const result = migrateSite(siteId, options.dryRun);
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
