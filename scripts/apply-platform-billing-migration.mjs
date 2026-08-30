#!/usr/bin/env node
/**
 * Apply platform billing D1 migrations (in order).
 *
 * Usage:
 *   node scripts/apply-platform-billing-migration.mjs
 *
 * Requires CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (or wrangler OAuth).
 * Database name defaults to lovely-home-platform-billing.
 */
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'platform/migrations');
const databaseName = process.env.PLATFORM_BILLING_D1_NAME?.trim() || 'lovely-home-platform-billing';

const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

if (!migrationFiles.length) {
  console.error(`No SQL migrations found in ${migrationsDir}`);
  process.exit(1);
}

for (const file of migrationFiles) {
  const migrationPath = join(migrationsDir, file);
  console.log(`Applying ${migrationPath} to D1 ${databaseName}…`);
  execFileSync('npx', ['wrangler', 'd1', 'execute', databaseName, '--remote', '--file', migrationPath], {
    cwd: root,
    stdio: 'inherit'
  });
}

console.log(`Done (${migrationFiles.length} migration file(s)).`);
