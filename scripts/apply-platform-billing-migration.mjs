#!/usr/bin/env node
/**
 * Apply platform billing D1 migrations.
 *
 * Usage:
 *   node scripts/apply-platform-billing-migration.mjs
 *
 * Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (or wrangler OAuth).
 * Database name defaults to lovely-home-platform-billing.
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const databaseName = process.env.PLATFORM_BILLING_D1_NAME?.trim() || 'lovely-home-platform-billing';
const migrationPath = join(root, 'platform/migrations/0001_site_billing.sql');

console.log(`Applying ${migrationPath} to D1 ${databaseName}…`);
execFileSync('npx', ['wrangler', 'd1', 'execute', databaseName, '--remote', '--file', migrationPath], {
  cwd: root,
  stdio: 'inherit'
});
console.log('Done.');
