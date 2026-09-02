#!/usr/bin/env node
/**
 * Full hub site provisioning for CI (terraform → worker → pages).
 *
 * Usage: node scripts/provision-hub-site.mjs <site_id> [--skip-pages] [--skip-platform-admin]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyLocalHubEnv, missingProvisionEnvKeys } from './lib/load-local-hub-env.mjs';
import { validateDeploySiteId } from './lib/site-registry.mjs';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import {
  isTerraformStack,
  terraformStackForSite,
  terraformStackVarArgs
} from './lib/terraform-stack.mjs';

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
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const siteMeta = registry[siteId];
const envStack = process.env.TF_VAR_terraform_stack?.trim() || process.env.TERRAFORM_STACK?.trim();
const siteStack = terraformStackForSite(siteId, siteMeta);
if (isTerraformStack(envStack) && envStack !== siteStack) {
  console.error(
    `TERRAFORM_STACK=${envStack} does not match site "${siteId}" (yaml stack is ${siteStack}).`
  );
  process.exit(1);
}
const terraformStack = isTerraformStack(envStack) ? envStack : siteStack;
process.env.TERRAFORM_STACK = terraformStack;
process.env.TF_VAR_terraform_stack = terraformStack;
const skipPlatformAdminEffective = skipPlatformAdmin || terraformStack === 'customers';
const tfDir = join(root, 'terraform');
const hubTfvarsPath = join(tfDir, 'environments/hub.tfvars');
const tfvarsPath = join(tfDir, 'environments/hub.generated.tfvars');
const generatedTfvars = join(root, 'scripts/generate-hub-tfvars.mjs');

if (applyLocalHubEnv(hubTfvarsPath)) {
  console.log('Loaded missing provision env from terraform/environments/hub.tfvars');
}

const missingEnv = missingProvisionEnvKeys();
if (missingEnv.length) {
  console.error(
    `Missing required env: ${missingEnv.join(', ')}. Export them or add the values to terraform/environments/hub.tfvars (see docs/platform-provision.md).`
  );
  process.exit(1);
}

function terraformApplyArgs() {
  return [
    'apply',
    '-auto-approve',
    '-var-file=environments/hub.generated.tfvars',
    '-var-file=environments/hub.generated.secrets.tfvars.json',
    ...terraformStackVarArgs(terraformStack),
    `-target=module.hub_site[${JSON.stringify(siteId)}]`
  ];
}

function runTerraformApply() {
  const retryDelaysSeconds = [45, 90, 120];
  const maxAttempts = retryDelaysSeconds.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`\n==> terraform ${terraformApplyArgs().join(' ')}`);
    const result = spawnSync('terraform', terraformApplyArgs(), {
      cwd: tfDir,
      env: process.env,
      encoding: 'utf8'
    });
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    if (result.status === 0) return;

    const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
    if (/\b401\b.*Unauthorized|Unauthorized.*\b401\b/i.test(output)) {
      console.error(
        '\nTerraform apply failed with Cloudflare 401 Unauthorized — fix CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID in GitHub secrets (see scripts/verify-cloudflare-api-token.sh). Not retrying.'
      );
      process.exit(result.status ?? 1);
    }

    if (/8000022|Invalid Service name \(\)/i.test(output)) {
      console.error(
        '\nTerraform apply failed updating Pages HUB_API binding (8000022). Check terraform/modules/hub_environment/variables.tf entrypoint = "default". Not retrying.'
      );
      process.exit(result.status ?? 1);
    }

    if (/Credential access key has length|InvalidArgument.*access key/i.test(output)) {
      console.error(
        '\nTerraform state backend failed — R2 credentials look wrong. Export Cloudflare R2 API token keys (32-char access key), not AWS IAM keys:\n  export AWS_ACCESS_KEY_ID="..."\n  export AWS_SECRET_ACCESS_KEY="..."\nSee docs/platform-provision.md § Remote Terraform state (R2). Not retrying.'
      );
      process.exit(result.status ?? 1);
    }

    if (/\b400\b Bad Request/i.test(output) && !/429|rate limit/i.test(output)) {
      console.error('\nTerraform apply failed with Cloudflare 400 Bad Request. Not retrying.');
      process.exit(result.status ?? 1);
    }

    if (attempt >= maxAttempts) {
      process.exit(result.status ?? 1);
    }

    const delay = retryDelaysSeconds[attempt - 1] ?? 120;
    console.warn(
      `\nTerraform apply failed (attempt ${attempt}/${maxAttempts}, often Cloudflare 429). Retrying in ${delay}s...`
    );
    execFileSync('sleep', [String(delay)]);
  }
}

function runTerraformRefreshOnly() {
  console.log(`\n==> terraform apply -refresh-only ${terraformApplyArgs().slice(1).join(' ')}`);
  run('terraform', ['apply', '-refresh-only', '-auto-approve', ...terraformApplyArgs().slice(1)], {
    cwd: tfDir
  });
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

console.log(`\n=== Provisioning hub site: ${siteId} (terraform_stack=${terraformStack}) ===`);

generateTfvars('pre-worker');
runTerraformApply();

run('node', [join(root, 'scripts/sync-wrangler-from-terraform.mjs'), siteId]);
run('node', [join(root, 'scripts/set-worker-secrets-from-terraform.mjs'), siteId]);

run('npm', ['run', `d1:migrate:${siteId}`, '--prefix', 'worker'], {
  env: {
    ...process.env,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ?? '',
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
  }
});

run('node', [join(root, 'scripts/seed-sitter-access-emails.mjs'), siteId]);

run('npm', ['run', `deploy:${siteId}`, '--prefix', 'worker'], {
  env: {
    ...process.env,
    CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ?? '',
    CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
  }
});

generateTfvars('post-worker');
runTerraformRefreshOnly();

if (!skipPages) {
  run('bash', [join(root, 'scripts/deploy-cloudflare-pages-site.sh'), siteId], {
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ?? '',
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
    }
  });

  if (siteId !== 'production') {
    run('node', [join(root, 'scripts/enable-hub-pages-previews.mjs'), siteId]);
  }
}

run('node', [join(root, 'scripts/mark-site-provisioned.mjs'), siteId]);

run('node', [join(root, 'scripts/build-platform-manifest.mjs')]);

if (!skipPlatformAdminEffective) {
  run('bash', [join(root, 'scripts/deploy-platform-admin.sh')], {
    env: {
      ...process.env,
      CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN ?? '',
      CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID ?? ''
    }
  });
}

console.log(`\n=== Provision complete: ${siteId} ===`);
