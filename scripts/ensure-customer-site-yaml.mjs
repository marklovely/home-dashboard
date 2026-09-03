#!/usr/bin/env node
/**
 * Write a customer hub into the local site registry if it is missing.
 * Used by provision CI so Terraform can run before git has the yaml row.
 *
 * Usage: node scripts/ensure-customer-site-yaml.mjs <site_id>
 */
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUSTOMER_HUB_ZONE_NAME } from './lib/hub-zones.mjs';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

const siteId = String(process.argv[2] ?? '').trim();
const idError = validateSiteId(siteId);
if (idError) {
  console.error(idError);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
if (registry[siteId]) {
  console.log(`Site ${siteId} is already in platform/sites.yaml.`);
  process.exit(0);
}

const result = spawnSync(
  process.execPath,
  [
    join(root, 'scripts/platform-site-manage.mjs'),
    'create',
    '--site-id',
    siteId,
    '--hostname',
    `${siteId}.${CUSTOMER_HUB_ZONE_NAME}`,
    '--zone-name',
    CUSTOMER_HUB_ZONE_NAME,
    '--hub-environment',
    siteId,
    '--vanilla',
    'false',
    '--terraform',
    'true'
  ],
  { cwd: root, stdio: 'inherit' }
);

process.exit(result.status === 0 ? 0 : result.status ?? 1);
