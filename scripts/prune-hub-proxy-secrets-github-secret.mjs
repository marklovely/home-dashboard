#!/usr/bin/env node
/**
 * Remove a deprovisioned site from the HUB_PROXY_SECRETS_JSON GitHub Actions secret.
 *
 * Usage: SITE_ID=demo node scripts/prune-hub-proxy-secrets-github-secret.mjs
 *
 * Optional cleanup: failures to update the GitHub secret are logged and do not fail deprovision.
 */
import { spawnSync } from 'node:child_process';
import { pruneHubProxySecretsJson } from './lib/prune-hub-site-config.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

const siteId = String(process.env.SITE_ID ?? process.argv[2] ?? '').trim();
const token = process.env.GH_TOKEN?.trim() || process.env.PLATFORM_GITHUB_TOKEN?.trim() || '';
const rawJson = process.env.HUB_PROXY_SECRETS_JSON ?? '';

if (!siteId) {
  console.error('Usage: SITE_ID=<site_id> node scripts/prune-hub-proxy-secrets-github-secret.mjs');
  process.exit(1);
}

const idError = validateSiteId(siteId);
if (idError) {
  console.error(idError);
  process.exit(1);
}

const { changed, value } = pruneHubProxySecretsJson(rawJson, siteId);
if (!changed) {
  console.log(`No "${siteId}" entry in HUB_PROXY_SECRETS_JSON — secret unchanged.`);
  process.exit(0);
}

if (!token) {
  console.warn(
    'GH_TOKEN / PLATFORM_GITHUB_TOKEN not set — cannot update HUB_PROXY_SECRETS_JSON automatically.'
  );
  process.exit(0);
}

console.log(`Updating HUB_PROXY_SECRETS_JSON (removed "${siteId}").`);
const result = spawnSync('gh', ['secret', 'set', 'HUB_PROXY_SECRETS_JSON', '--body', value ?? '{}'], {
  stdio: 'inherit',
  env: { ...process.env, GH_TOKEN: token }
});

if (result.status === 0) {
  console.log(`Removed "${siteId}" from HUB_PROXY_SECRETS_JSON.`);
  process.exit(0);
}

console.warn(
  `Could not update HUB_PROXY_SECRETS_JSON (gh exit ${result.status ?? 'unknown'}). ` +
    'Deprovision succeeded — remove the site entry from the secret manually if needed.'
);
process.exit(0);
