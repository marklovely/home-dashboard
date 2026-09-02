#!/usr/bin/env node
/**
 * After terraform init for a split stack, refuse to continue if state is still
 * the combined estate or has not been migrated yet.
 *
 * Usage: node scripts/assert-terraform-stack-state.mjs <platform|customers>
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { terraformStackStateError } from './lib/assert-terraform-stack-state.mjs';
import { isTerraformStack } from './lib/terraform-stack.mjs';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';

const stack = process.argv[2]?.trim();
if (!isTerraformStack(stack)) {
  console.error('Usage: node scripts/assert-terraform-stack-state.mjs <platform|customers>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tfDir = join(root, 'terraform');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));

let stateList = '';
try {
  stateList = execFileSync('terraform', ['state', 'list'], {
    cwd: tfDir,
    encoding: 'utf8'
  });
} catch {
  stateList = '';
}

const error = terraformStackStateError(stack, stateList, registry);
if (error) {
  console.error(error);
  process.exit(1);
}

console.log(`Terraform ${stack} state looks split (not the legacy combined estate).`);
