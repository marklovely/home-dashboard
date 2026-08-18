#!/usr/bin/env node
/**
 * Full hub site provisioning for CI (terraform → worker → pages).
 *
 * Usage: node scripts/provision-hub-site.mjs <site_id> [--skip-pages] [--skip-platform-admin]
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeploySiteId } from './lib/site-registry.mjs';

const args = process.argv.slice(2);
const siteId = args.find((arg) => !arg.startsWith('--'))?.trim();
const skipPages = args.includes('--skip-pages');
const skipPlatformAdmin = args.includes('--skip-platform-admin');

if (!siteId) {
  console.error('Usage: node scripts/provision-hub-site.mjs <site_id> [--skip-pages] [--skip-platform-admin]');
  process.exit(1);
}

const deployError = validateDeploySiteId(siteId);
if (deployError) {
  console.error(deployError);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tfDir = join(root, 'terraform');
const tfvarsPath = join(tfDir, 'environments/hub.generated.tfvars');
const generatedTfvars = join(root, 'scripts/generate-hub-tfvars.mjs');

function terraformApplyArgs() {
  return ['apply', '-auto-approve', '-var-file=environments/hub.generated.tfvars', '-var-file=environments/hub.generated.secrets.tfvars.json'];
}

function run(command, commandArgs, options = {}) {
  console.log(`\n==> ${command} ${commandArgs.join(' ')}`);
  execFileSync(command, commandArgs, {
    cwd: options.cwd ?? root,
    stdio: 'inherit',
    env: { ...process.env, ...(options.env ?? {}) }
  });
}

function generateTfvars(phase) {
  run('node', [generatedTfvars, '--output', tfvarsPath], {
    env: {
      ...process.env,
      PROVISION_SITE_ID: siteId,
      PROVISION_PHASE: phase
    }
  });
}

console.log(`\n=== Provisioning hub site: ${siteId} ===`);

generateTfvars('pre-worker');
run('terraform', terraformApplyArgs(), {
  cwd: tfDir
});

run('node', [join(root, 'scripts/sync-wrangler-from-terraform.mjs'), siteId]);
run('node', [join(root, 'scripts/set-worker-secrets-from-terraform.mjs'), siteId]);

run('npm', ['run', `d1:migrate:${siteId}`, '--prefix', 'worker'], {
  env: {
    ...process.env,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ?? '',
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
  }
});

run('npm', ['run', `deploy:${siteId}`, '--prefix', 'worker'], {
  env: {
    ...process.env,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ?? '',
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
  }
});

generateTfvars('post-worker');
run('terraform', terraformApplyArgs(), {
  cwd: tfDir
});

run('node', [join(root, 'scripts/mark-site-provisioned.mjs'), siteId]);

if (!skipPages) {
  run('bash', [join(root, 'scripts/deploy-cloudflare-pages-site.sh'), siteId], {
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ?? '',
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
    }
  });
}

run('node', [join(root, 'scripts/build-platform-manifest.mjs')]);

if (!skipPlatformAdmin) {
  run('bash', [join(root, 'scripts/deploy-platform-admin.sh')], {
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ?? '',
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
    }
  });
}

console.log(`\n=== Provision complete: ${siteId} ===`);
