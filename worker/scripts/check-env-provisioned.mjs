#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const PLACEHOLDER_RE = /REPLACE_AFTER_(?:PROVISION_[A-Z0-9_-]+|TERRAFORM_APPLY)/;

/**
 * @param {string} toml
 * @param {string} envName
 * @returns {string | null}
 */
export function extractEnvBlock(toml, envName) {
  const header = `[env.${envName}]`;
  const start = toml.indexOf(header);
  if (start === -1) return null;

  const slice = toml.slice(start);
  const nextMatch = slice.slice(header.length).search(/\n\[env\.|\n# ---/);
  return nextMatch === -1 ? slice : slice.slice(0, header.length + nextMatch);
}

/**
 * @param {string} block
 * @returns {boolean}
 */
export function envBlockHasPlaceholder(block) {
  return PLACEHOLDER_RE.test(block);
}

function main() {
  const envName = process.argv[2]?.trim();
  if (!envName) {
    console.error('Usage: node scripts/check-env-provisioned.mjs <env_name>');
    process.exit(1);
  }

  const dir = dirname(fileURLToPath(import.meta.url));
  const toml = readFileSync(join(dir, '..', 'wrangler.toml'), 'utf8');
  const block = extractEnvBlock(toml, envName);

  if (!block) {
    console.error(`Missing [env.${envName}] in worker/wrangler.toml.`);
    process.exit(1);
  }

  if (envBlockHasPlaceholder(block)) {
    console.error(
      `[env.${envName}] database_id is not set (placeholder still present).\n` +
        `Run: terraform apply + node ../../scripts/sync-wrangler-from-terraform.mjs ${envName}\n` +
        `Or:  npm run provision:${envName}`
    );
    process.exit(1);
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main();
}
