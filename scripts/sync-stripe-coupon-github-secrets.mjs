#!/usr/bin/env node
/**
 * Copy Stripe referral + intro coupon ids from hub.tfvars into GitHub Actions secrets.
 *
 * Requires: gh auth login (repo secret write access)
 *
 * Usage:
 *   node scripts/sync-stripe-coupon-github-secrets.mjs
 *   node scripts/sync-stripe-coupon-github-secrets.mjs terraform/environments/hub.tfvars
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseHubTfvarsText,
  STRIPE_COUPON_HUB_TFVAR_FIELDS,
  STRING_FIELD_TO_ENV
} from './lib/load-local-hub-env.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hubTfvarsPath =
  process.argv[2]?.trim() || join(root, 'terraform/environments/hub.tfvars');

if (!existsSync(hubTfvarsPath)) {
  console.error(`hub.tfvars not found: ${hubTfvarsPath}`);
  console.error('Copy terraform/environments/hub.tfvars.example or pass a path.');
  process.exit(1);
}

try {
  execFileSync('gh', ['auth', 'status'], { cwd: root, stdio: 'pipe' });
} catch {
  console.error('GitHub CLI is not authenticated. Run: gh auth login');
  process.exit(1);
}

const { strings } = parseHubTfvarsText(readFileSync(hubTfvarsPath, 'utf8'));

/** @type {string[]} */
const updated = [];
/** @type {string[]} */
const skipped = [];

for (const field of STRIPE_COUPON_HUB_TFVAR_FIELDS) {
  const secretName = STRING_FIELD_TO_ENV[field];
  const value = strings[field]?.trim() || '';
  if (!secretName) continue;

  if (!value) {
    skipped.push(secretName);
    continue;
  }

  execFileSync('gh', ['secret', 'set', secretName], {
    cwd: root,
    input: value,
    stdio: ['pipe', 'inherit', 'inherit']
  });
  updated.push(secretName);
}

if (updated.length === 0) {
  console.error('No coupon ids found in hub.tfvars — nothing was synced.');
  if (skipped.length) {
    console.error(`Missing tfvars keys: ${STRIPE_COUPON_HUB_TFVAR_FIELDS.join(', ')}`);
  }
  process.exit(1);
}

console.log(`Synced ${updated.length} GitHub secret(s) from ${hubTfvarsPath}:`);
for (const name of updated) {
  console.log(`  ${name}`);
}

if (skipped.length) {
  console.log('');
  console.log('Skipped (empty or missing in tfvars):');
  for (const name of skipped) {
    console.log(`  ${name}`);
  }
}
