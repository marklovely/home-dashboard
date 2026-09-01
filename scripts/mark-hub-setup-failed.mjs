#!/usr/bin/env node
/**
 * Record a hub setup failure on site_billing so signup-success.html can
 * stop polling "deploying" and tell the buyer to email support.
 *
 * Usage:
 *   node scripts/mark-hub-setup-failed.mjs <site-id> --kind provision --message "..."
 *   node scripts/mark-hub-setup-failed.mjs <site-id> --kind registry --message "..."
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hubSetupFailedSql } from './lib/hub-setup-failed.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const siteId = String(args[0] ?? '').trim();
const kindIndex = args.indexOf('--kind');
const messageIndex = args.indexOf('--message');
const kind = kindIndex >= 0 ? String(args[kindIndex + 1] ?? '').trim() : '';
const message = messageIndex >= 0 ? String(args[messageIndex + 1] ?? '').trim() : '';
const databaseName = process.env.PLATFORM_BILLING_D1_NAME?.trim() || 'lovely-home-platform-billing';

if (!siteId || !kind) {
  console.error(
    'Usage: node scripts/mark-hub-setup-failed.mjs <site-id> --kind provision|registry [--message "..."]'
  );
  process.exit(1);
}

const sql = hubSetupFailedSql({ siteId, kind, message });

try {
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', databaseName, '--remote', '--yes', '--command', sql],
    { cwd: root, stdio: 'inherit' }
  );
} catch (error) {
  console.error(
    `mark-hub-setup-failed: could not record ${kind} failure for ${siteId}. ${
      error instanceof Error ? error.message : String(error)
    }`
  );
  process.exit(1);
}

console.log(`Recorded ${kind} setup failure for ${siteId}`);
