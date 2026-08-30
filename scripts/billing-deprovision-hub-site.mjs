#!/usr/bin/env node
/**
 * Local/emergency billing teardown: remove registry stubs, then deprovision infra inline.
 * CI uses platform-site-billing-deprovision.yml instead (archive → registry PR → v5 deprovision on merge).
 * Run after archive-hub-site-backup.mjs while the site is still live in Terraform.
 *
 * Usage: node scripts/billing-deprovision-hub-site.mjs <site_id> [--skip-platform-admin]
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateBillingDeprovisionSiteId } from './lib/site-registry.mjs';

const args = process.argv.slice(2);
const siteId = args.find((arg) => !arg.startsWith('--'))?.trim();
const skipPlatformAdmin = args.includes('--skip-platform-admin');

if (!siteId) {
  console.error('Usage: node scripts/billing-deprovision-hub-site.mjs <site_id> [--skip-platform-admin]');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const billingError = validateBillingDeprovisionSiteId(siteId, registry);
if (billingError) {
  console.error(billingError);
  process.exit(1);
}

const hostname = String(registry[siteId]?.hostname ?? '').trim();
if (!hostname) {
  console.error(`Site "${siteId}" has no hostname in platform/sites.yaml.`);
  process.exit(1);
}

function run(command, commandArgs, options = {}) {
  console.log(`\n==> ${command} ${commandArgs.join(' ')}`);
  execFileSync(command, commandArgs, {
    cwd: options.cwd ?? root,
    stdio: 'inherit',
    env: { ...process.env, ...(options.env ?? {}) }
  });
}

console.log(`\n=== Billing deprovision: ${siteId} ===`);

run('node', [
  join(root, 'scripts/platform-site-manage.mjs'),
  'delete',
  '--site-id',
  siteId,
  '--confirm-hostname',
  hostname
]);

const deprovisionArgs = [join(root, 'scripts/deprovision-hub-site.mjs'), siteId];
if (skipPlatformAdmin) deprovisionArgs.push('--skip-platform-admin');
run('node', deprovisionArgs);

console.log(`\n=== Billing deprovision complete: ${siteId} ===`);
