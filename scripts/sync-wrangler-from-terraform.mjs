#!/usr/bin/env node
/**
 * Patch worker/wrangler.toml [env.{site}] from terraform output.
 * Usage: node scripts/sync-wrangler-from-terraform.mjs sandbox
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readSiteContract } from './lib/read-site-contract.mjs';
import { dedupeEnvVarsBlock, upsertEnvVar } from './lib/wrangler-env-vars.mjs';
import { patchEnvD1FromTerraform } from './lib/wrangler-env-block.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/sync-wrangler-from-terraform.mjs <site_id>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wranglerPath = join(root, 'worker', 'wrangler.toml');

const resolved = readSiteContract(siteId);
if (!resolved) {
  console.error(
    `Site "${siteId}" not found in terraform output, manifest, or registry. Run terraform apply or build-platform-manifest first.`
  );
  process.exit(1);
}
if (resolved.source !== 'terraform') {
  console.warn(
    `sync-wrangler-from-terraform: using ${resolved.source} contract for "${siteId}" (terraform output "sites" unavailable).`
  );
}
const contract = resolved.site;

const d1Id = contract.d1_database_id;
if (!d1Id) {
  console.error('terraform output missing d1_database_id');
  process.exit(1);
}

let toml = readFileSync(wranglerPath, 'utf8');
const envHeader = `[env.${siteId}]`;

if (!toml.includes(envHeader)) {
  console.error(`Missing ${envHeader} in worker/wrangler.toml — add the env block first.`);
  process.exit(1);
}

const { toml: patchedToml, changed: d1Changed } = patchEnvD1FromTerraform(
  toml,
  siteId,
  d1Id,
  String(contract.d1_database_name ?? '')
);
toml = patchedToml;

if (!toml.includes(`database_id = "${d1Id}"`)) {
  console.error(`Failed to patch [env.${siteId}] database_id to ${d1Id}`);
  process.exit(1);
}

if (d1Changed) {
  console.log(`Patched [env.${siteId}] database_id → ${d1Id}`);
} else {
  console.log(`wrangler.toml already has database_id ${d1Id} for ${siteId}`);
}

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || '';
const accessVars = {
  CLOUDFLARE_ACCOUNT_ID: accountId,
  ACCESS_PAGES_APP_ID: String(contract.access_pages_app_id ?? ''),
  ACCESS_WORKER_APP_ID: String(contract.access_worker_app_id ?? '')
};

for (const [key, value] of Object.entries(accessVars)) {
  if (!value) continue;
  toml = upsertEnvVar(toml, siteId, key, value);
}

toml = dedupeEnvVarsBlock(toml, siteId);

writeFileSync(wranglerPath, toml);
console.log(JSON.stringify(contract, null, 2));
