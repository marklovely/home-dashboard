#!/usr/bin/env node
/**
 * Set Worker secrets from terraform output (non-interactive, for CI).
 * Requires CLOUDFLARE_API_TOKEN with Workers Scripts Edit (covers wrangler secret put).
 *
 * Usage: node scripts/set-worker-secrets-from-terraform.mjs <site_id>
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeploySiteId } from './lib/site-registry.mjs';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/set-worker-secrets-from-terraform.mjs <site_id>');
  process.exit(1);
}

const deployError = validateDeploySiteId(siteId);
if (deployError) {
  console.error(deployError);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const workerDir = join(root, 'worker');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));
const vanilla = registry[siteId]?.vanilla !== false;

const contractRaw = execFileSync(
  'node',
  [join(root, 'scripts/lib/terraform-site-output.mjs'), 'site', siteId],
  { encoding: 'utf8' }
);
const contract = JSON.parse(contractRaw);
const hubProxy = execFileSync(
  'node',
  [join(root, 'scripts/lib/terraform-site-output.mjs'), 'hub-proxy-secret', siteId],
  { encoding: 'utf8' }
).trim();

const ownerEmails = (process.env.OWNER_EMAILS ?? '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean)
  .join(',');

if (!ownerEmails) {
  console.error('OWNER_EMAILS env var is required (comma-separated).');
  process.exit(1);
}

/** @type {Record<string, string>} */
const secrets = {
  HUB_PROXY_SECRET: hubProxy,
  CF_ACCESS_TEAM_DOMAIN: String(contract.cf_access_team_domain ?? ''),
  CF_ACCESS_AUD: String(contract.access_aud_combined ?? ''),
  OWNER_EMAILS: ownerEmails
};

if (vanilla) {
  Object.assign(secrets, {
    OWNER_PIN: '0000',
    VIRTUAL_BUTTONS_ACCESS_CODE: 'vanilla',
    PRIVATE_WIFI_SSID: 'VanillaGuest',
    PRIVATE_WIFI_PASSWORD: 'vanilla-guest',
    PRIVATE_MARK_PHONE: '+440000000000',
    PRIVATE_MARK_EMAIL: 'vanilla@example.com',
    PRIVATE_DONNA_PHONE: '+440000000001',
    PRIVATE_DONNA_EMAIL: 'vanilla2@example.com',
    PRIVATE_HOME_ADDRESS: 'Vanilla demo site',
    PRIVATE_LOCKBOX_CODE: '0000'
  });
}

for (const [name, value] of Object.entries(secrets)) {
  if (!value) {
    console.error(`Missing value for secret ${name}`);
    process.exit(1);
  }
  console.log(`Setting Worker secret ${name} (--env ${siteId})`);
  execFileSync(
    'npx',
    ['wrangler', 'secret', 'put', name, '--env', siteId],
    {
      cwd: workerDir,
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    }
  );
}

console.log(`Worker secrets configured for ${siteId}.`);
