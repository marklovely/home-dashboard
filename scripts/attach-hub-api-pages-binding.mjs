#!/usr/bin/env node
/**
 * Attach HUB_API Pages service binding after the Worker is deployed.
 * Uses the Cloudflare API directly — the terraform provider PATCH often returns
 * 8000022 ("Invalid Service name ()") for new site bindings.
 *
 * Usage: node scripts/attach-hub-api-pages-binding.mjs <site_id>
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeploySiteId } from './lib/site-registry.mjs';
import { extractEnvBlock } from '../worker/scripts/check-env-provisioned.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/attach-hub-api-pages-binding.mjs <site_id>');
  process.exit(1);
}

const deployError = validateDeploySiteId(siteId);
if (deployError) {
  console.error(deployError);
  process.exit(1);
}

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {string} siteId
 * @returns {{ pagesProject: string, workerName: string }}
 */
function resolveSiteBindingTargets(siteId) {
  try {
    const contractRaw = execFileSync(
      'node',
      [join(root, 'scripts/lib/terraform-site-output.mjs'), 'site', siteId],
      { cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const contract = JSON.parse(contractRaw);
    const pagesProject = String(contract.pages_project ?? '').trim();
    const workerName = String(contract.worker_name ?? '').trim();
    if (pagesProject && workerName) {
      return { pagesProject, workerName };
    }
  } catch {
    // Fall back to wrangler + naming convention when terraform state is unavailable locally.
  }

  const toml = readFileSync(join(root, 'worker/wrangler.toml'), 'utf8');
  const block = extractEnvBlock(toml, siteId);
  const nameMatch = block?.match(/^name\s*=\s*"([^"]+)"/m);
  const workerName = nameMatch?.[1]?.trim() ?? '';
  const pagesProject = `home-dashboard-${siteId}`;
  if (!workerName) {
    throw new Error(`Could not resolve worker name for ${siteId} (terraform output and wrangler.toml).`);
  }
  console.warn(`Using wrangler.toml fallback: ${pagesProject} → ${workerName}`);
  return { pagesProject, workerName };
}

const { pagesProject, workerName } = resolveSiteBindingTargets(siteId);

const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${pagesProject}`;
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
};

async function cfJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
  const body = await response.json();
  if (!body.success) {
    const msg = body.errors?.map((error) => error.message).join('; ') ?? JSON.stringify(body.errors);
    throw new Error(`${options.method ?? 'GET'} ${url} failed: ${msg}`);
  }
  return body.result;
}

const project = await cfJson(baseUrl);
const deploymentConfigs = structuredClone(project.deployment_configs ?? {});
deploymentConfigs.production ??= {};
deploymentConfigs.preview ??= {
  fail_open: true,
  compatibility_date: '2024-12-01',
  compatibility_flags: ['nodejs_compat']
};

const hubApiBinding = {
  ...(deploymentConfigs.production.services ?? {}),
  HUB_API: { service: workerName }
};
deploymentConfigs.production.services = hubApiBinding;
deploymentConfigs.preview.services = structuredClone(hubApiBinding);

console.log(`Attaching HUB_API → ${workerName} on Pages project ${pagesProject} (production + preview)`);
await cfJson(baseUrl, {
  method: 'PATCH',
  body: JSON.stringify({ deployment_configs: deploymentConfigs })
});

const updated = await cfJson(baseUrl);
const attachedService =
  updated?.deployment_configs?.production?.services?.HUB_API?.service ?? '';
if (attachedService !== workerName) {
  console.error(
    `HUB_API binding verification failed for ${siteId}: expected ${workerName}, got ${attachedService || '(none)'}`
  );
  process.exit(1);
}

console.log(`HUB_API binding attached for ${siteId} (${pagesProject} → ${workerName}).`);
console.log('Redeploy Pages after attach if usesHubApiBinding is still false (deploy-cloudflare-pages-site.sh does this automatically).');
