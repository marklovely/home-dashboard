#!/usr/bin/env node
/**
 * Attach HUB_API Pages service binding after the Worker is deployed.
 * Uses the Cloudflare API directly — the terraform provider PATCH often returns
 * 8000022 ("Invalid Service name ()") for new site bindings.
 *
 * Usage: node scripts/attach-hub-api-pages-binding.mjs <site_id>
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeploySiteId } from './lib/site-registry.mjs';

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

const contractRaw = execFileSync(
  'node',
  [join(root, 'scripts/lib/terraform-site-output.mjs'), 'site', siteId],
  { cwd: root, encoding: 'utf8' }
);
const contract = JSON.parse(contractRaw);
const pagesProject = String(contract.pages_project ?? '').trim();
const workerName = String(contract.worker_name ?? '').trim();

if (!pagesProject || !workerName) {
  console.error(`Missing pages_project or worker_name in terraform output for ${siteId}.`);
  process.exit(1);
}

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

console.log(`HUB_API binding attached for ${siteId}.`);
