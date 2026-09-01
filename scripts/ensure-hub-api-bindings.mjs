#!/usr/bin/env node
/**
 * Re-attach HUB_API on any terraform hub whose production Pages binding is missing.
 * Git auto-deploys from main can drop production.services while preview still has HUB_API.
 *
 * Usage: node scripts/ensure-hub-api-bindings.mjs [site_id...]
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import {
  pagesProjectNameForSite,
  productionHubApiMissing,
  workerNameForSite
} from './lib/hub-api-pages-binding.mjs';

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const requested = process.argv.slice(2).map((arg) => arg.trim()).filter(Boolean);
const siteIds =
  requested.length > 0
    ? requested
    : Object.entries(registry)
        .filter(([, meta]) => meta.terraform !== false)
        .map(([siteId]) => siteId);

/**
 * @param {string} path
 * @param {string} [method]
 * @param {unknown} [payload]
 */
async function cf(path, method = 'GET', payload) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: payload === undefined ? undefined : JSON.stringify(payload)
    }
  );
  const body = await response.json();
  if (!body.success) {
    const msg = body.errors?.map((error) => error.message).join('; ') ?? JSON.stringify(body.errors);
    throw new Error(`${method} ${path} failed: ${msg}`);
  }
  return body.result;
}

/**
 * @param {string} siteId
 */
async function retryLatestProductionDeployment(siteId) {
  const pagesProject = pagesProjectNameForSite(siteId);
  const deployments = await cf(`/pages/projects/${encodeURIComponent(pagesProject)}/deployments?env=production`);
  const latest = Array.isArray(deployments) ? deployments[0] : null;
  if (!latest?.id) {
    console.warn(`No production deployment to retry for ${siteId}.`);
    return;
  }
  await cf(`/pages/projects/${encodeURIComponent(pagesProject)}/deployments/${latest.id}/retry`, 'POST', {});
  console.log(`Retried production Pages deploy ${latest.id} for ${siteId}.`);
}

let failed = 0;
let repaired = 0;

for (const siteId of siteIds) {
  if (registry[siteId]?.terraform === false) {
    console.error(`Site "${siteId}" is not terraform-managed.`);
    failed += 1;
    continue;
  }

  let pagesProject = pagesProjectNameForSite(siteId);
  let workerName = workerNameForSite(siteId);
  try {
    const contractRaw = execFileSync(
      'node',
      [join(root, 'scripts/lib/terraform-site-output.mjs'), 'site', siteId],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    const contract = JSON.parse(contractRaw);
    if (contract.pages_project) pagesProject = String(contract.pages_project).trim();
    if (contract.worker_name) workerName = String(contract.worker_name).trim();
  } catch {
    /* Local terraform state is optional — naming convention is enough. */
  }

  const project = await cf(`/pages/projects/${encodeURIComponent(pagesProject)}`);
  if (!productionHubApiMissing(project, workerName)) {
    console.log(`HUB_API ok: ${siteId} (${pagesProject} → ${workerName})`);
    continue;
  }

  console.warn(`HUB_API missing on ${siteId} production Pages — attaching ${workerName}`);
  const attach = spawnSync('node', [join(root, 'scripts/attach-hub-api-pages-binding.mjs'), siteId], {
    cwd: root,
    env: process.env,
    stdio: 'inherit'
  });
  if (attach.status !== 0) {
    failed += 1;
    continue;
  }
  await retryLatestProductionDeployment(siteId);
  repaired += 1;
}

if (failed > 0) {
  console.error(`Failed to repair ${failed} site(s).`);
  process.exit(1);
}

console.log(repaired === 0 ? 'All hub HUB_API bindings present.' : `Re-attached HUB_API on ${repaired} site(s).`);
