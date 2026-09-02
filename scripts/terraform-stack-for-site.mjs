#!/usr/bin/env node
/**
 * Print the Terraform stack (platform | customers) or R2 backend key.
 *
 * Usage:
 *   node scripts/terraform-stack-for-site.mjs <site_id> [--backend-key] [--guess]
 *   node scripts/terraform-stack-for-site.mjs --stack <platform|customers> [--backend-key]
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import {
  guessTerraformStackForMissingSite,
  isTerraformStack,
  terraformBackendKey,
  terraformStackForSite
} from './lib/terraform-stack.mjs';

const args = process.argv.slice(2);
const wantKey = args.includes('--backend-key');
const guess = args.includes('--guess');

/** @type {string | null} */
let stackArg = null;
/** @type {string | null} */
let siteId = null;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--stack') {
    stackArg = args[i + 1] ?? '';
    i += 1;
    continue;
  }
  if (arg === '--backend-key' || arg === '--guess') continue;
  if (arg.startsWith('--')) {
    console.error(`Unknown flag ${arg}`);
    process.exit(1);
  }
  siteId = arg;
}

if (stackArg != null && stackArg !== '') {
  if (!isTerraformStack(stackArg)) {
    console.error(' --stack must be platform or customers.');
    process.exit(1);
  }
  process.stdout.write(`${wantKey ? terraformBackendKey(stackArg) : stackArg}\n`);
  process.exit(0);
}

if (!siteId) {
  console.error(
    'Usage: node scripts/terraform-stack-for-site.mjs <site_id> [--backend-key] [--guess]\n' +
      '       node scripts/terraform-stack-for-site.mjs --stack <platform|customers> [--backend-key]'
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const site = registry[siteId];
if (!site && !guess) {
  console.error(`Site "${siteId}" is not in platform/sites.yaml. Pass --guess for deprovision.`);
  process.exit(1);
}

const stack = site ? terraformStackForSite(siteId, site) : guessTerraformStackForMissingSite(siteId);
process.stdout.write(`${wantKey ? terraformBackendKey(stack) : stack}\n`);
