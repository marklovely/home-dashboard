#!/usr/bin/env node
/**
 * Copy archive bucket name + platform health Access tokens into GitHub Actions
 * secrets so billing deprovision can fetch the live hub and store JSON.
 *
 * Usage:
 *   node scripts/sync-platform-archive-github-secrets.mjs
 *   terraform state pull | node scripts/sync-platform-archive-github-secrets.mjs --from-state-stdin
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stdin } from 'node:process';
import { applyLocalHubEnv } from './lib/load-local-hub-env.mjs';
import { PLATFORM_ARCHIVE_R2_BUCKET_NAME } from './lib/platform-archive-storage.mjs';
import { parsePlatformHealthServiceTokenFromState } from './lib/platform-archive-github-secrets.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fromStdin = process.argv.includes('--from-state-stdin');

const stateJson = fromStdin ? await readStdin() : pullTerraformState();
const token = parsePlatformHealthServiceTokenFromState(stateJson);
if (!token) {
  console.error(
    'Could not read platform health service token from Terraform state. Run terraform init with the R2 backend.'
  );
  process.exit(1);
}

setGithubSecret('PLATFORM_ARCHIVE_R2_BUCKET', PLATFORM_ARCHIVE_R2_BUCKET_NAME);
setGithubSecret('PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID', token.clientId);
setGithubSecret('PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET', token.clientSecret);

console.log('GitHub secrets updated:');
console.log(`  PLATFORM_ARCHIVE_R2_BUCKET (${PLATFORM_ARCHIVE_R2_BUCKET_NAME})`);
console.log('  PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID');
console.log('  PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET');

function pullTerraformState() {
  applyLocalHubEnv(join(root, 'terraform/environments/hub.tfvars'));
  return execFileSync('terraform', ['state', 'pull'], {
    cwd: join(root, 'terraform'),
    encoding: 'utf8'
  });
}

function readStdin() {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = [];
    stdin.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    stdin.on('error', reject);
  });
}

/**
 * @param {string} name
 * @param {string} value
 */
function setGithubSecret(name, value) {
  execFileSync('gh', ['secret', 'set', name], {
    cwd: root,
    input: value,
    stdio: ['pipe', 'inherit', 'inherit']
  });
}
