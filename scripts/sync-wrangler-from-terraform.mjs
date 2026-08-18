#!/usr/bin/env node
/**
 * Patch worker/wrangler.toml [env.{site}] from terraform output.
 * Usage: node scripts/sync-wrangler-from-terraform.mjs sandbox
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/sync-wrangler-from-terraform.mjs <site_id>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wranglerPath = join(root, 'worker', 'wrangler.toml');
const placeholderTerraform = 'REPLACE_AFTER_TERRAFORM_APPLY';
const placeholderProvision = `REPLACE_AFTER_PROVISION_${siteId.toUpperCase()}`;

let sites;
try {
  const raw = execFileSync('terraform', ['output', '-json', 'sites'], {
    cwd: join(root, 'terraform'),
    encoding: 'utf8'
  });
  sites = JSON.parse(raw);
} catch (error) {
  console.error('Run terraform apply first (from terraform/).', error.message);
  process.exit(1);
}

const contract = sites[siteId];
if (!contract) {
  console.error(`Site "${siteId}" not found in terraform output. Managed sites: ${Object.keys(sites).join(', ')}`);
  process.exit(1);
}

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

if (toml.includes(placeholderProvision)) {
  toml = toml.replaceAll(placeholderProvision, d1Id);
  console.log(`Patched ${placeholderProvision} → ${d1Id}`);
} else if (toml.includes(placeholderTerraform)) {
  toml = toml.replaceAll(placeholderTerraform, d1Id);
  console.log(`Patched ${placeholderTerraform} → ${d1Id}`);
} else if (toml.includes(d1Id)) {
  console.log(`wrangler.toml already contains database_id ${d1Id} for ${siteId}`);
} else {
  console.warn(
    `Placeholder not found (${placeholderProvision} or ${placeholderTerraform}). Update [env.${siteId}] database_id manually to ${d1Id}`
  );
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

writeFileSync(wranglerPath, toml);
console.log(JSON.stringify(contract, null, 2));

/**
 * @param {string} toml
 * @param {string} siteId
 * @param {string} key
 * @param {string} value
 */
function upsertEnvVar(toml, siteId, key, value) {
  const assignment = `${key} = "${value.replace(/"/g, '\\"')}"`;
  const varsBlockRe = new RegExp(
    `(\\[env\\.${siteId}\\.vars\\][\\s\\S]*?)(?=\\n\\[|\\n\\[\\[|$)`,
    'm'
  );
  const match = toml.match(varsBlockRe);
  if (!match) return toml;

  const block = match[1];
  const keyRe = new RegExp(`^${key}\\s*=.*$`, 'm');
  const nextBlock = keyRe.test(block)
    ? block.replace(keyRe, assignment)
    : `${block.trimEnd()}\n${assignment}\n`;
  return toml.replace(block, nextBlock);
}
