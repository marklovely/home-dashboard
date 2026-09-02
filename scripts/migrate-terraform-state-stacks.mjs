#!/usr/bin/env node
/**
 * Split legacy home-dashboard/hub.tfstate JSON into platform + customers files.
 *
 * Does not push to R2 by itself — the shell wrapper / workflow does that after
 * terraform init on each new backend key. Leaves hub.tfstate untouched as backup.
 *
 * Usage:
 *   node scripts/migrate-terraform-state-stacks.mjs \
 *     --input /tmp/legacy.tfstate.json \
 *     --platform-out /tmp/platform.tfstate.json \
 *     --customers-out /tmp/customers.tfstate.json
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { splitTerraformState } from './lib/split-terraform-state.mjs';

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
    'Usage: node scripts/migrate-terraform-state-stacks.mjs --input <legacy.json> --platform-out <path> --customers-out <path>'
  );
  process.exit(args.includes('--help') ? 0 : 1);
}

const inputPath = requiredArg('--input');
const platformOut = requiredArg('--platform-out');
const customersOut = requiredArg('--customers-out');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));

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

const split = splitTerraformState(state, registry);
if (split.counts.total === 0) {
  console.error('Legacy state has no resources — refusing to write empty split files.');
  process.exit(1);
}
if (split.counts.customers === 0) {
  console.warn('Warning: no customer hub_site modules found in legacy state.');
}
if (split.counts.platform === 0) {
  console.error('Legacy state has no platform resources — refusing to split.');
  process.exit(1);
}

mkdirSync(dirname(platformOut), { recursive: true });
mkdirSync(dirname(customersOut), { recursive: true });
writeFileSync(platformOut, `${JSON.stringify(split.platform, null, 2)}\n`);
writeFileSync(customersOut, `${JSON.stringify(split.customers, null, 2)}\n`);

console.log(
  `Split ${split.counts.total} resources → platform ${split.counts.platform}, customers ${split.counts.customers}.`
);
console.log(`Wrote ${platformOut}`);
console.log(`Wrote ${customersOut}`);
console.log('hub.tfstate was not modified. Push the new files only after terraform init on the new backend keys.');
