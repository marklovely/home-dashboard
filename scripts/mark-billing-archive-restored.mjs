#!/usr/bin/env node
/**
 * Record that a platform archive was restored into a reprovisioned hub.
 *
 * Usage: node scripts/mark-billing-archive-restored.mjs <site_id>
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteId = process.argv[2]?.trim();
const databaseName = process.env.PLATFORM_BILLING_D1_NAME?.trim() || 'lovely-home-platform-billing';

if (!siteId) {
  console.error('Usage: node scripts/mark-billing-archive-restored.mjs <site_id>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const now = Date.now();
const sql = `UPDATE site_billing SET archive_restored_at = ${now}, updated_at = ${now} WHERE site_id = '${siteId.replace(/'/g, "''")}';`;

execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', databaseName, '--remote', '--yes', '--command', sql],
  { cwd: root, stdio: 'inherit' }
);

console.log(`Marked archive restored for ${siteId}`);
