#!/usr/bin/env node
/**
 * Force reseed the public demo hub (or any demo_public site) via Worker admin API.
 *
 * Usage:
 *   node scripts/reseed-demo-hub.mjs [site_id]
 *
 * Auth (first match wins):
 *   HUB_PROXY_SECRET env var
 *   terraform output hub_proxy_secrets[site_id]
 *
 * Example:
 *   node scripts/reseed-demo-hub.mjs demo
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateDeploySiteId } from './lib/site-registry.mjs';

const siteId = process.argv[2]?.trim() || 'demo';
const deployError = validateDeploySiteId(siteId);
if (deployError) {
  console.error(deployError);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const site = registry[siteId];

if (!site?.demo_public) {
  console.error(`Site "${siteId}" is not marked demo_public in platform/sites.yaml.`);
  process.exit(1);
}

const hostname = String(site.hostname ?? '').trim();
if (!hostname) {
  console.error(`Site "${siteId}" has no hostname in platform/sites.yaml.`);
  process.exit(1);
}

/** @type {string | undefined} */
let secret = process.env.HUB_PROXY_SECRET?.trim() || undefined;
if (!secret) {
  try {
    secret = execFileSync(
      'node',
      [join(root, 'scripts/lib/terraform-site-output.mjs'), 'hub-proxy-secret', siteId],
      { encoding: 'utf8' }
    ).trim();
  } catch {
    /* terraform not applied locally */
  }
}

if (!secret) {
  console.error(
    'HUB_PROXY_SECRET is required — set the env var or run terraform apply so hub-proxy-secret can be read.'
  );
  process.exit(1);
}

const url = `https://${hostname}/api/demo/reseed`;
const response = await fetch(url, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${secret}`,
    Accept: 'application/json'
  }
});

const bodyText = await response.text();
/** @type {Record<string, unknown>} */
let body = {};
try {
  body = JSON.parse(bodyText);
} catch {
  body = { raw: bodyText };
}

if (!response.ok) {
  console.error(`Reseed failed (${response.status}):`, body.error?.message ?? bodyText);
  process.exit(1);
}

console.log(`Demo hub reseeded: https://${hostname}`);
if (body.reseeded) {
  console.log('Fresh fictional seed data is now live.');
}
