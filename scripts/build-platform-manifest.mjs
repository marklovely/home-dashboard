#!/usr/bin/env node
/**
 * Merge platform/sites.yaml with terraform output -json sites into platform-manifest.json.
 * Usage: node scripts/build-platform-manifest.mjs
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sitesYamlPath = join(root, 'platform/sites.yaml');
const tfDir = join(root, 'terraform');
const outDir = join(root, 'platform-admin/public');
const outPath = join(outDir, 'platform-manifest.json');

/** @type {Record<string, object>} */
let terraformSites = {};
/** @type {Record<string, string>} */
let platformMeta = {
  githubRepo: 'marklovely/home-dashboard'
};

try {
  const raw = execFileSync('terraform', ['output', '-json', 'sites'], {
    cwd: tfDir,
    encoding: 'utf8'
  });
  terraformSites = JSON.parse(raw);
} catch {
  console.warn('build-platform-manifest: no terraform output (run terraform apply or import first).');
}

for (const [key, outputName, parser] of [
  ['cloudflareAccountId', 'cloudflare_account_id', (v) => v.trim()],
  ['accessTeamDomain', 'access_team_domain', (v) => v.trim()],
  ['zoneName', 'zone_name', (v) => v.trim()]
]) {
  try {
    const value = execFileSync('terraform', ['output', '-raw', outputName], {
      cwd: tfDir,
      encoding: 'utf8'
    });
    platformMeta[key] = parser(value);
  } catch {
    /* optional */
  }
}

try {
  const adminRaw = execFileSync('terraform', ['output', '-json', 'platform_admin'], {
    cwd: tfDir,
    encoding: 'utf8'
  });
  const admin = JSON.parse(adminRaw);
  if (admin?.cf_access_team_domain) {
    platformMeta.accessTeamDomain = admin.cf_access_team_domain;
  }
} catch {
  /* optional */
}

if (!platformMeta.cloudflareAccountId && process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
  platformMeta.cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID.trim();
}
/** @type {Record<string, object>} */
const sites = {};

for (const [siteId, meta] of Object.entries(registry)) {
  const contract = terraformSites[siteId] ?? null;
  const hostname = String(meta.hostname ?? '');
  sites[siteId] = {
    siteId,
    hostname,
    hubEnvironment: meta.hub_environment ?? siteId,
    vanilla: Boolean(meta.vanilla),
    terraform: Boolean(meta.terraform),
    pagesProject:
      contract?.pages_project ??
      (siteId === 'production' ? 'home-dashboard' : `home-dashboard-${siteId}`),
    workerName:
      contract?.worker_name ??
      (siteId === 'production' ? 'lovely-home-hub-api' : `lovely-home-hub-api-${siteId}`),
    pagesUrl: contract?.pages_url ?? (hostname ? `https://${hostname}` : ''),
    workerApiOrigin:
      contract?.worker_api_origin ??
      (contract?.worker_hostname ? `https://${contract.worker_hostname}` : null),
    contract,
    provisioning: buildProvisioningChecklist(siteId, meta, contract)
  };
}

const manifest = {
  generatedAt: new Date().toISOString(),
  platform: platformMeta,
  sites
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Wrote ${outPath} (${Object.keys(sites).length} sites)`);

/**
 * @param {string} siteId
 * @param {Record<string, unknown>} meta
 * @param {Record<string, unknown> | null} contract
 */
function buildProvisioningChecklist(siteId, meta, contract) {
  const steps = [];
  if (!meta.terraform) {
    steps.push({
      id: 'import',
      label: 'Not Terraform-managed — import or keep manual',
      done: false
    });
    return steps;
  }
  steps.push({
    id: 'terraform',
    label: 'Terraform module in state',
    done: Boolean(contract)
  });
  steps.push({
    id: 'worker',
    label: 'Worker deployed (Wrangler)',
    done: null
  });
  steps.push({
    id: 'pages',
    label: 'Pages production deployment',
    done: null
  });
  steps.push({
    id: 'hub-api',
    label: 'HUB_API Pages binding',
    done: null
  });
  if (siteId !== 'production') {
    steps.push({
      id: 'access-probe',
      label: 'Access + API probe healthy',
      done: null
    });
  }
  return steps;
}
