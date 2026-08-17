#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const envName = process.argv[2]?.trim();
if (!envName) {
  console.error('Usage: node scripts/check-env-provisioned.mjs <env_name>');
  process.exit(1);
}

const dir = dirname(fileURLToPath(import.meta.url));
const toml = readFileSync(join(dir, '..', 'wrangler.toml'), 'utf8');
const placeholder = `REPLACE_AFTER_PROVISION_${envName.toUpperCase()}`;

if (toml.includes(placeholder)) {
  console.error(
    `[env.${envName}] database_id is not set (${placeholder}).\n` +
      `Run: terraform apply + node ../../scripts/sync-wrangler-from-terraform.mjs ${envName}\n` +
      `Or:  npm run provision:${envName}`
  );
  process.exit(1);
}
