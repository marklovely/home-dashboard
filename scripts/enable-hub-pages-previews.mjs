#!/usr/bin/env node
/**
 * Enable Cloudflare Pages preview builds for Terraform-managed hub sites.
 * Uses the Cloudflare API directly — Terraform PATCH of preview + HUB_API bindings
 * returns 8000022 for non-production Workers.
 *
 * Copies production env vars and HUB_API service binding to preview.
 *
 * Usage: node scripts/enable-hub-pages-previews.mjs [site_id...]
 *   With no args, updates every terraform site in platform/sites.yaml.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));

/** @type {string[]} */
const requested = process.argv.slice(2).map((arg) => arg.trim()).filter(Boolean);

/** @type {string[]} */
const siteIds =
  requested.length > 0
    ? requested
    : Object.entries(registry)
        .filter(([, meta]) => meta.terraform !== false)
        .map(([siteId]) => siteId);

for (const siteId of siteIds) {
  const siteError = validateSiteId(siteId);
  if (siteError) {
    console.error(siteError);
    process.exit(1);
  }
  if (registry[siteId]?.terraform === false) {
    console.error(`Site "${siteId}" is not terraform-managed.`);
    process.exit(1);
  }
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json'
};

/**
 * @param {string} url
 * @param {RequestInit} [options]
 */
async function cfJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...headers, ...(options.headers ?? {}) } });
  const body = await response.json();
  if (!body.success) {
    const msg = body.errors?.map((error) => error.message).join('; ') ?? JSON.stringify(body.errors);
    throw new Error(`${options.method ?? 'GET'} ${url} failed: ${msg}`);
  }
  return body.result;
}

for (const siteId of siteIds) {
  const contractRaw = execFileSync(
    'node',
    [join(root, 'scripts/lib/terraform-site-output.mjs'), 'site', siteId],
    { cwd: root, encoding: 'utf8' }
  );
  const contract = JSON.parse(contractRaw);
  const pagesProject = String(contract.pages_project ?? '').trim();
  if (!pagesProject) {
    console.error(`Missing pages_project in terraform output for ${siteId}.`);
    process.exit(1);
  }

  const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${pagesProject}`;
  const project = await cfJson(baseUrl);
  const deploymentConfigs = structuredClone(project.deployment_configs ?? {});
  deploymentConfigs.production ??= {};
  deploymentConfigs.preview ??= {
    fail_open: true,
    compatibility_date: '2024-12-01',
    compatibility_flags: ['nodejs_compat']
  };

  if (deploymentConfigs.production.env_vars) {
    deploymentConfigs.preview.env_vars = structuredClone(deploymentConfigs.production.env_vars);
  }
  if (deploymentConfigs.production.services) {
    deploymentConfigs.preview.services = structuredClone(deploymentConfigs.production.services);
  }

  const source = structuredClone(project.source ?? { type: 'github', config: {} });
  source.config ??= {};
  source.config.preview_deployment_setting = 'all';

  console.log(`Enabling preview deployments on ${pagesProject} (${siteId})`);
  await cfJson(baseUrl, {
    method: 'PATCH',
    body: JSON.stringify({
      source,
      deployment_configs: deploymentConfigs
    })
  });
}

console.log(`Preview deployments enabled for: ${siteIds.join(', ')}`);
console.log(
  '\nPreview env vars and HUB_API binding were copied from production. Redeploy an open PR preview to pick them up.'
);
console.log(
  'If Access login fails on preview URLs, run terraform apply (see docs/platform-terraform.md#pages-preview-access-invalid-redirect-url).'
);
