#!/usr/bin/env node
/**
 * Ensure the public demo Pages project uses DEMO_PUBLIC auth (not Cloudflare Access).
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/ensure-demo-pages-env.mjs
 */
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();

if (!token || !accountId) {
  console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
  process.exit(1);
}

const sites = loadSitesYaml(join(root, 'platform/sites.yaml'));
const demo = sites.demo;
if (!demo) {
  console.error('demo site missing from platform/sites.yaml');
  process.exit(1);
}

const pagesProject = 'home-dashboard-demo';
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

const envVars = { ...(deploymentConfigs.production.env_vars ?? {}) };
delete envVars.CF_ACCESS_TEAM_DOMAIN;
delete envVars.CF_ACCESS_AUD_PAGES;

envVars.DEMO_PUBLIC = { type: 'plain_text', value: 'true' };
envVars.VITE_HUB_ENVIRONMENT = { type: 'plain_text', value: 'demo' };
envVars.VITE_DEPLOYMENT_MODE = { type: 'plain_text', value: 'home' };

deploymentConfigs.production.env_vars = envVars;

console.log('Updating home-dashboard-demo production env:');
console.log('  DEMO_PUBLIC=true');
console.log('  removed CF_ACCESS_TEAM_DOMAIN / CF_ACCESS_AUD_PAGES (if present)');

await cfJson(baseUrl, {
  method: 'PATCH',
  body: JSON.stringify({ deployment_configs: deploymentConfigs })
});

console.log('');
console.log('Done. Redeploy demo Pages so the active deployment picks up env vars:');
console.log('  bash scripts/deploy-cloudflare-pages-site.sh demo');
console.log('');
console.log('Also check Zero Trust → Access → Applications and delete any app still');
console.log(`protecting ${demo.hostname} (demo must not use Cloudflare Access).`);
