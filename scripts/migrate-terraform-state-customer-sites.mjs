#!/usr/bin/env node
/**
 * Split combined home-dashboard/customers.tfstate JSON into per-site files.
 *
 * Does not push to R2 — the shell wrapper does that after terraform init on
 * each customers/{siteId}.tfstate key. Leaves customers.tfstate untouched.
 *
 * Usage:
 *   node scripts/migrate-terraform-state-customer-sites.mjs \
 *     --input /tmp/customers.tfstate.json \
 *     --out-dir /tmp/customer-sites
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { splitCustomerSiteStates } from './lib/split-terraform-state.mjs';
import { terraformBackendSiteIdError } from './lib/terraform-stack.mjs';

const args = process.argv.slice(2);

/**
 * @param {string} flag
 */
function requiredArg(flag) {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : '';
  if (!value || value.startsWith('--')) {
    console.error(`Missing ${flag} <path>`);
    process.exit(1);
  }
  return value;
}

if (args.includes('--help') || args.length === 0) {
  console.error(
    'Usage: node scripts/migrate-terraform-state-customer-sites.mjs --input <customers.json> --out-dir <dir>'
  );
  process.exit(args.includes('--help') ? 0 : 1);
}

const inputPath = requiredArg('--input');
const outDir = requiredArg('--out-dir');

/** @type {Record<string, unknown>} */
let state;
try {
  state = JSON.parse(readFileSync(inputPath, 'utf8'));
} catch (error) {
  console.error(
    `Could not read Terraform state JSON from ${inputPath}: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}

if (state.version !== 4 && state.version !== 3) {
  console.error(`Unsupported terraform state version ${String(state.version)} — expected 3 or 4.`);
  process.exit(1);
}

const split = splitCustomerSiteStates(state);
if (split.counts.leftover > 0) {
  console.error(
    `Combined customers state has ${split.counts.leftover} resource(s) that are not hub_site modules. Refusing to split.`
  );
  process.exit(1);
}
if (split.counts.sites === 0) {
  console.error('Combined customers state has no hub_site modules — nothing to split.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
for (const [siteId, siteState] of Object.entries(split.files)) {
  const error = terraformBackendSiteIdError(siteId);
  if (error) {
    console.error(error);
    process.exit(1);
  }
  const outPath = join(outDir, `${siteId}.tfstate.json`);
  writeFileSync(outPath, `${JSON.stringify(siteState, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
}

console.log(`Split ${split.counts.total} resources → ${split.counts.sites} per-site state files.`);
console.log('customers.tfstate was not modified. Push the new files only after terraform init on each per-site key.');
