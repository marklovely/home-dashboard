#!/usr/bin/env node
/**
 * Seed sitter Access login emails into D1 house_settings from platform/sites.yaml.
 * Usage: node scripts/seed-sitter-access-emails.mjs <site_id>
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEmailList } from './lib/email-lists.mjs';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateDeploySiteId } from './lib/site-registry.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/seed-sitter-access-emails.mjs <site_id>');
  process.exit(1);
}

const deployError = validateDeploySiteId(siteId);
if (deployError) {
  console.error(deployError);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const emails = parseEmailList(registry[siteId]?.sitter_emails);
if (emails.length === 0) {
  console.log(`No sitter_emails for ${siteId} in platform/sites.yaml — skipping D1 seed.`);
  process.exit(0);
}

const dbName = `lovely-home-appliance-manuals-${siteId}`;
const value = JSON.stringify(emails).replace(/'/g, "''");
const sql = `INSERT INTO house_settings (key, value, updated_at) VALUES ('sitter_access_emails', '${value}', ${Math.floor(Date.now() / 1000)}) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`;

execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', dbName, '--remote', '--env', siteId, '--command', sql],
  {
    cwd: join(root, 'worker'),
    stdio: 'inherit',
    env: process.env
  }
);

console.log(`Seeded ${emails.length} sitter email(s) into D1 for ${siteId}.`);
