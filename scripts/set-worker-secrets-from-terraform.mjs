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
import { formatEmailList } from './lib/email-lists.mjs';

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
const demoPublic = registry[siteId]?.demo_public === true;

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

const registryEntry = registry[siteId];
let ownerEmails = formatEmailList(registryEntry?.owner_emails);
if (!ownerEmails && Array.isArray(contract.owner_emails) && contract.owner_emails.length) {
  ownerEmails = formatEmailList(contract.owner_emails);
}
if (!ownerEmails) {
  ownerEmails = formatEmailList(process.env.OWNER_EMAILS);
}

if (!ownerEmails) {
  console.error(
    'Owner emails are required — set owner_emails on the site in platform/sites.yaml or OWNER_EMAILS env (comma-separated).'
  );
  process.exit(1);
}

/** @type {Record<string, string>} */
const secrets = {
  HUB_PROXY_SECRET: hubProxy,
  OWNER_EMAILS: ownerEmails
};

if (!demoPublic) {
  secrets.CF_ACCESS_TEAM_DOMAIN = String(contract.cf_access_team_domain ?? '');
  secrets.CF_ACCESS_AUD = String(contract.access_aud_combined ?? '');
  const accessManagementToken =
    process.env.CF_ACCESS_MANAGEMENT_TOKEN?.trim() || process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (accessManagementToken) {
    secrets.CF_ACCESS_MANAGEMENT_TOKEN = accessManagementToken;
  }
} else {
  secrets.DEMO_USERNAME = process.env.DEMO_USERNAME?.trim() || 'demo';
  secrets.DEMO_PASSWORD = process.env.DEMO_PASSWORD?.trim() || 'lovely-demo';
}

if (vanilla) {
  Object.assign(secrets, {
    OWNER_PIN: demoPublic ? '1234' : '0000',
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
