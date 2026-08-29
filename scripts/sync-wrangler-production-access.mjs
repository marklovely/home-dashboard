#!/usr/bin/env node
/**
 * Patch top-level worker/wrangler.toml [vars] for production Access sitter sync.
 *
 * Reads terraform output for site "production" when available, otherwise discovers
 * Access app IDs via the Cloudflare API.
 *
 * Usage (from repo root):
 *   node scripts/sync-wrangler-production-access.mjs
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  dedupeTopLevelVarsBlock,
  upsertTopLevelVar
} from './lib/wrangler-env-vars.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wranglerPath = join(root, 'worker', 'wrangler.toml');
const PRODUCTION_SITE_ID = 'production';
const PRODUCTION_PAGES_HOST = 'dashboard.lovely-home.co.uk';
const PRODUCTION_WORKER_NAME = 'lovely-home-hub-api';

/**
 * @returns {Record<string, string> | null}
 */
function readTerraformProductionContract() {
  try {
    const raw = execFileSync(
      'node',
      [join(root, 'scripts/lib/terraform-site-output.mjs'), 'site', PRODUCTION_SITE_ID],
      { encoding: 'utf8' }
    );
    const contract = JSON.parse(raw);
    const pagesAppId = String(contract.access_pages_app_id ?? '').trim();
    const workerAppId = String(contract.access_worker_app_id ?? '').trim();
    if (!pagesAppId || !workerAppId) return null;
    return {
      access_pages_app_id: pagesAppId,
      access_worker_app_id: workerAppId,
      source: 'terraform'
    };
  } catch {
    return null;
  }
}

/**
 * @returns {Promise<Record<string, string>>}
 */
async function discoverProductionAccessAppIds() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !token) {
    throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN to discover Access app IDs.');
  }

  const raw = execFileSync(
    'node',
    [
      join(root, 'scripts/discover-access-app-ids.mjs'),
      PRODUCTION_PAGES_HOST,
      PRODUCTION_WORKER_NAME
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: token }
    }
  );

  const discovered = JSON.parse(raw);
  const pagesAppId = String(discovered.access_pages_app_id ?? '').trim();
  const workerAppId = String(discovered.access_worker_app_id ?? '').trim();
  if (!pagesAppId || !workerAppId) {
    throw new Error('Discovery did not return both Access app IDs.');
  }

  return {
    access_pages_app_id: pagesAppId,
    access_worker_app_id: workerAppId,
    source: 'cloudflare-api'
  };
}

const terraformContract = readTerraformProductionContract();
const contract =
  terraformContract ??
  (await discoverProductionAccessAppIds());

const accountId =
  process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ||
  readFileSync(wranglerPath, 'utf8').match(/^account_id\s*=\s*"([^"]+)"/m)?.[1] ||
  '';

if (!accountId) {
  console.error('Could not resolve CLOUDFLARE_ACCOUNT_ID.');
  process.exit(1);
}

let toml = readFileSync(wranglerPath, 'utf8');
toml = upsertTopLevelVar(toml, 'CLOUDFLARE_ACCOUNT_ID', accountId);
toml = upsertTopLevelVar(toml, 'ACCESS_PAGES_APP_ID', contract.access_pages_app_id);
toml = upsertTopLevelVar(toml, 'ACCESS_WORKER_APP_ID', contract.access_worker_app_id);
toml = dedupeTopLevelVarsBlock(toml);
writeFileSync(wranglerPath, toml);

console.log(`Patched production Access sync vars in worker/wrangler.toml (source: ${contract.source}).`);
console.log(`  ACCESS_PAGES_APP_ID=${contract.access_pages_app_id}`);
console.log(`  ACCESS_WORKER_APP_ID=${contract.access_worker_app_id}`);
console.log('\nNext steps:');
console.log('  1. node scripts/set-production-access-sync-secret.mjs');
console.log('  2. npm run deploy --prefix worker');
console.log('  3. Re-save the scheduled stay (or sitter login emails) in Settings to push emails to Access');
