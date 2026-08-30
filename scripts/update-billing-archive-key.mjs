#!/usr/bin/env node
/**
 * Store platform archive R2 key on site_billing after billing deprovision.
 *
 * Usage: node scripts/update-billing-archive-key.mjs <site_id> <archive_r2_key>
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteId = process.argv[2]?.trim();
const archiveR2Key = process.argv[3]?.trim();
const databaseName = process.env.PLATFORM_BILLING_D1_NAME?.trim() || 'lovely-home-platform-billing';

if (!siteId || !archiveR2Key) {
  console.error('Usage: node scripts/update-billing-archive-key.mjs <site_id> <archive_r2_key>');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sql = `UPDATE site_billing SET archive_r2_key = '${archiveR2Key.replace(/'/g, "''")}', updated_at = ${Date.now()} WHERE site_id = '${siteId.replace(/'/g, "''")}';`;

execFileSync(
  'npx',
  ['wrangler', 'd1', 'execute', databaseName, '--remote', '--command', sql],
  { cwd: root, stdio: 'inherit' }
);

console.log(`Updated archive_r2_key for ${siteId}`);
