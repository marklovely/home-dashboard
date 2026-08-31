#!/usr/bin/env node
/**
 * Read a site's owner email from the platform billing database.
 *
 * Customer emails are never committed to the repository, so provisioning reads
 * them here and passes them to Terraform through SITE_OWNER_EMAILS_JSON.
 *
 * Usage:
 *   node scripts/fetch-site-owner-emails.mjs <site-id> [--github-env]
 *
 * Prints {"<site-id>":["owner@example.com"]} on stdout. Exits 0 with an empty
 * map when no billing row exists (operator-created sites keep using
 * platform/sites.yaml), so provisioning is never blocked by a missing lookup.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ownerEmailsFromWranglerJson, siteOwnerEmailsEnvValue } from './lib/site-owner-emails.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const siteId = String(args[0] ?? '').trim();
const writeGithubEnv = args.includes('--github-env');
const databaseName = process.env.PLATFORM_BILLING_D1_NAME?.trim() || 'lovely-home-platform-billing';

if (!/^[a-z][a-z0-9_-]{0,31}$/.test(siteId)) {
  console.error('Usage: node scripts/fetch-site-owner-emails.mjs <site-id> [--github-env]');
  process.exit(1);
}

/** @type {string[]} */
let emails = [];
try {
  const escaped = siteId.replace(/'/g, "''");
  const stdout = execFileSync(
    'npx',
    [
      'wrangler',
      'd1',
      'execute',
      databaseName,
      '--remote',
      '--yes',
      '--json',
      '--command',
      `SELECT owner_email FROM site_billing WHERE site_id = '${escaped}'`
    ],
    { cwd: root, encoding: 'utf8' }
  );
  emails = ownerEmailsFromWranglerJson(JSON.parse(stdout));
} catch (error) {
  console.error(
    `fetch-site-owner-emails: could not read billing owner email for ${siteId} — falling back to platform/sites.yaml. ${
      error instanceof Error ? error.message : String(error)
    }`
  );
}

const value = siteOwnerEmailsEnvValue(siteId, emails);
process.stdout.write(`${value}\n`);

if (writeGithubEnv && process.env.GITHUB_ENV) {
  appendFileSync(process.env.GITHUB_ENV, `SITE_OWNER_EMAILS_JSON=${value}\n`);
}

if (emails.length === 0) {
  console.error(`fetch-site-owner-emails: no billing owner email recorded for ${siteId}.`);
}
