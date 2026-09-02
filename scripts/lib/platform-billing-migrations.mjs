/** @type {readonly string[]} */
export const PLATFORM_BILLING_MIGRATION_FILES = [
  '0001_site_billing.sql',
  '0002_site_billing_provision.sql',
  '0003_site_billing_deprovision.sql',
  '0004_signup_guards.sql',
  '0005_customer_emails.sql',
  '0006_account_otp.sql',
  '0007_platform_settings.sql'
];

export const PLATFORM_BILLING_MIGRATIONS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS platform_billing_schema_migrations (
  name TEXT PRIMARY KEY,
  applied_at INTEGER NOT NULL
);
`.trim();

/**
 * @param {string[]} files
 */
export function sortMigrationFiles(files) {
  return [...files]
    .filter((name) => name.endsWith('.sql'))
    .sort((a, b) => a.localeCompare(b));
}

/**
 * Infer applied migration filenames from live site_billing schema.
 *
 * @param {{ hasSiteBillingTable: boolean; columns: Set<string> }} schema
 */
export function inferAppliedMigrationNames(schema) {
  /** @type {string[]} */
  const applied = [];
  if (schema.hasSiteBillingTable) {
    applied.push('0001_site_billing.sql');
  }
  if (schema.columns.has('provision_dispatched_at')) {
    applied.push('0002_site_billing_provision.sql');
  }
  if (schema.columns.has('deprovision_dispatched_at')) {
    applied.push('0003_site_billing_deprovision.sql');
  }
  if (schema.columns.has('registry_dispatched_at')) {
    applied.push('0004_signup_guards.sql');
  }
  if (schema.columns.has('signup_email_sent_at')) {
    applied.push('0005_customer_emails.sql');
  }
  return applied;
}

/**
 * @param {string[]} allFiles sorted migration filenames
 * @param {Set<string>} applied migration filenames already applied
 */
export function pendingMigrationFiles(allFiles, applied) {
  return allFiles.filter((file) => !applied.has(file));
}

/**
 * @param {unknown} wranglerJson
 * @returns {string[]}
 */
export function parseMigrationNamesFromWranglerJson(wranglerJson) {
  const payload = Array.isArray(wranglerJson) ? wranglerJson[0] : wranglerJson;
  const rows = payload?.results ?? [];
  return rows
    .map((row) => String(row?.name ?? '').trim())
    .filter(Boolean);
}

/**
 * @param {unknown} wranglerJson
 * @returns {Set<string>}
 */
export function parseSiteBillingColumnsFromWranglerJson(wranglerJson) {
  const payload = Array.isArray(wranglerJson) ? wranglerJson[0] : wranglerJson;
  const rows = payload?.results ?? [];
  return new Set(
    rows
      .map((row) => String(row?.name ?? '').trim())
      .filter(Boolean)
  );
}

/**
 * @param {unknown} wranglerJson
 */
export function siteBillingTableExistsFromWranglerJson(wranglerJson) {
  const payload = Array.isArray(wranglerJson) ? wranglerJson[0] : wranglerJson;
  const rows = payload?.results ?? [];
  return rows.some((row) => String(row?.name ?? '') === 'site_billing');
}

/**
 * @param {Set<string>} recorded
 * @param {string[]} inferred
 */
export function mergeAppliedMigrationNames(recorded, inferred) {
  return new Set([...recorded, ...inferred]);
}
