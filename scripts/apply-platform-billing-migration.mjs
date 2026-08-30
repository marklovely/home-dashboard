#!/usr/bin/env node
/**
 * Apply platform billing D1 migrations (in order, skipping already-applied).
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
import {
  inferAppliedMigrationNames,
  mergeAppliedMigrationNames,
  parseMigrationNamesFromWranglerJson,
  parseSiteBillingColumnsFromWranglerJson,
  pendingMigrationFiles,
  PLATFORM_BILLING_MIGRATIONS_TABLE_SQL,
  siteBillingTableExistsFromWranglerJson,
  sortMigrationFiles
} from './lib/platform-billing-migrations.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const migrationsDir = join(root, 'platform/migrations');
const databaseName = process.env.PLATFORM_BILLING_D1_NAME?.trim() || 'lovely-home-platform-billing';

const migrationFiles = sortMigrationFiles(readdirSync(migrationsDir));

if (!migrationFiles.length) {
  console.error(`No SQL migrations found in ${migrationsDir}`);
  process.exit(1);
}

ensureMigrationsTable();
const recorded = new Set(readRecordedMigrationNames());
const inferred = inferAppliedMigrationNames(readSiteBillingSchema());
const applied = mergeAppliedMigrationNames(recorded, inferred);

for (const name of inferred) {
  if (!recorded.has(name)) {
    recordMigration(name);
    console.log(`Recorded previously applied migration ${name} (schema inference).`);
  }
}

const pending = pendingMigrationFiles(migrationFiles, applied);
if (!pending.length) {
  console.log(`Platform billing D1 is up to date (${migrationFiles.length} migration file(s)).`);
  process.exit(0);
}

for (const file of pending) {
  const migrationPath = join(migrationsDir, file);
  console.log(`Applying ${migrationPath} to D1 ${databaseName}…`);
  d1ExecuteFile(migrationPath);
  recordMigration(file);
}

console.log(`Done (applied ${pending.length} migration file(s)).`);

function ensureMigrationsTable() {
  d1ExecuteCommand(PLATFORM_BILLING_MIGRATIONS_TABLE_SQL);
}

function readRecordedMigrationNames() {
  try {
    const json = d1ExecuteCommand(
      'SELECT name FROM platform_billing_schema_migrations ORDER BY name'
    );
    return parseMigrationNamesFromWranglerJson(json);
  } catch {
    return [];
  }
}

function readSiteBillingSchema() {
  let hasSiteBillingTable = false;
  /** @type {Set<string>} */
  let columns = new Set();
  try {
    const tableJson = d1ExecuteCommand(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'site_billing'"
    );
    hasSiteBillingTable = siteBillingTableExistsFromWranglerJson(tableJson);
  } catch {
    hasSiteBillingTable = false;
  }
  if (hasSiteBillingTable) {
    try {
      const columnsJson = d1ExecuteCommand('PRAGMA table_info(site_billing)');
      columns = parseSiteBillingColumnsFromWranglerJson(columnsJson);
    } catch {
      columns = new Set();
    }
  }
  return { hasSiteBillingTable, columns };
}

/**
 * @param {string} name
 */
function recordMigration(name) {
  const appliedAt = Date.now();
  const escaped = name.replace(/'/g, "''");
  d1ExecuteCommand(
    `INSERT OR IGNORE INTO platform_billing_schema_migrations (name, applied_at) VALUES ('${escaped}', ${appliedAt})`
  );
}

/**
 * @param {string} command
 */
function d1ExecuteCommand(command) {
  const stdout = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', databaseName, '--remote', '--yes', '--json', '--command', command],
    { cwd: root, encoding: 'utf8' }
  );
  return JSON.parse(stdout);
}

/**
 * @param {string} migrationPath
 */
function d1ExecuteFile(migrationPath) {
  execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', databaseName, '--remote', '--yes', '--file', migrationPath],
    { cwd: root, stdio: 'inherit' }
  );
}
