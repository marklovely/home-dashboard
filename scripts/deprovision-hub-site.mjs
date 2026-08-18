#!/usr/bin/env node
/**
 * Full hub site deprovisioning for CI (worker delete → terraform destroy → manifest).
 *
 * Usage: node scripts/deprovision-hub-site.mjs <site_id> [--skip-platform-admin]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { suggestedWorkerName, validateDeprovisionSiteId } from './lib/site-registry.mjs';
import { hubSiteModuleInState } from './lib/terraform-state.mjs';

const args = process.argv.slice(2);
const siteId = args.find((arg) => !arg.startsWith('--'))?.trim();
const skipPlatformAdmin = args.includes('--skip-platform-admin');

if (!siteId) {
  console.error('Usage: node scripts/deprovision-hub-site.mjs <site_id> [--skip-platform-admin]');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const deprovisionError = validateDeprovisionSiteId(siteId, registry);
if (deprovisionError) {
  console.error(deprovisionError);
  process.exit(1);
}

const tfDir = join(root, 'terraform');
const workerDir = join(root, 'worker');
const tfvarsPath = join(tfDir, 'environments/hub.generated.tfvars');
const generatedTfvars = join(root, 'scripts/generate-hub-tfvars.mjs');

function readWorkerName() {
  try {
    const contractRaw = execFileSync(
      'node',
      [join(root, 'scripts/lib/terraform-site-output.mjs'), 'site', siteId],
      { encoding: 'utf8' }
    );
    const name = JSON.parse(contractRaw).worker_name?.trim();
    if (name) return name;
  } catch {
    // fall through to naming convention
  }
  return suggestedWorkerName(siteId);
}

function terraformDestroyArgs() {
  return [
    'destroy',
    '-auto-approve',
    '-var-file=environments/hub.generated.tfvars',
    '-var-file=environments/hub.generated.secrets.tfvars.json',
    `-target=module.hub_site[${JSON.stringify(siteId)}]`
  ];
}

function runTerraformDestroy() {
  const retryDelaysSeconds = [45, 90, 120];
  const maxAttempts = retryDelaysSeconds.length + 1;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    console.log(`\n==> terraform ${terraformDestroyArgs().join(' ')}`);
    const result = spawnSync('terraform', terraformDestroyArgs(), {
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
        '\nTerraform destroy failed with Cloudflare 401 Unauthorized — fix CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID. Not retrying.'
      );
      process.exit(result.status ?? 1);
    }

    if (/\b400\b Bad Request/i.test(output) && !/429|rate limit/i.test(output)) {
      console.error('\nTerraform destroy failed with Cloudflare 400 Bad Request. Not retrying.');
      process.exit(result.status ?? 1);
    }

    if (attempt >= maxAttempts) {
      process.exit(result.status ?? 1);
    }

    const delay = retryDelaysSeconds[attempt - 1] ?? 120;
    console.warn(
      `\nTerraform destroy failed (attempt ${attempt}/${maxAttempts}, often Cloudflare 429). Retrying in ${delay}s...`
    );
    execFileSync('sleep', [String(delay)]);
  }
}

function run(command, commandArgs, options = {}) {
  console.log(`\n==> ${command} ${commandArgs.join(' ')}`);
  execFileSync(command, commandArgs, {
    cwd: options.cwd ?? root,
    stdio: 'inherit',
    env: { ...process.env, ...(options.env ?? {}) }
  });
}

function deleteWorker(workerName) {
  console.log(`\n==> npx wrangler delete ${workerName} --force`);
  const result = spawnSync('npx', ['wrangler', 'delete', workerName, '--force'], {
    cwd: workerDir,
    env: process.env,
    encoding: 'utf8'
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status === 0) return;

  const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`;
  if (/not found|does not exist|10007|8000007|could not find|no worker/i.test(output)) {
    console.warn(`Worker ${workerName} already absent — continuing.`);
    return;
  }

  process.exit(result.status ?? 1);
}

console.log(`\n=== Deprovisioning hub site: ${siteId} ===`);

const workerName = readWorkerName();
deleteWorker(workerName);

const inState = hubSiteModuleInState(siteId, tfDir);
if (!inState) {
  console.warn(`No module.hub_site["${siteId}"] in terraform state — skipping destroy.`);
} else {
  run('node', [generatedTfvars, '--output', tfvarsPath], {
    env: { ...process.env, DEPROVISION_SITE_ID: siteId }
  });
  runTerraformDestroy();
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

console.log(`\n=== Deprovision complete: ${siteId} ===`);
console.log('Remove the site block from local hub.tfvars if present.');
console.log(`Optional: remove "${siteId}" from HUB_PROXY_SECRETS_JSON GitHub secret.`);
