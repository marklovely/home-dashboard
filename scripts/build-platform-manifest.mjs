#!/usr/bin/env node
/**
 * Merge platform/sites.yaml with terraform output -json sites into platform-manifest.json.
 * When Terraform state is unavailable (e.g. Cloudflare Pages CI), preserves contracts
 * from the existing manifest file committed in git. When it is available, Terraform
 * output wins outright — a managed site missing from it has been destroyed, so its
 * committed contract is dropped instead of resurrected.
 *
 * Usage: node scripts/build-platform-manifest.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { parseEmailList } from './lib/email-lists.mjs';
import { findEmailAddresses, redactEmailFields } from './lib/platformManifestPrivacy.mjs';
import {
  hasTerraformContract,
  mergePlatformMeta,
  resolveSiteContract,
  siteManifestFields,
  terraformOutputIsAuthoritative
} from './lib/platformManifestMerge.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sitesYamlPath = join(root, 'platform/sites.yaml');
const tfDir = join(root, 'terraform');
const outDir = join(root, 'platform-admin/public');
const outPath = join(outDir, 'platform-manifest.json');

/** @type {Record<string, object>} */
let terraformSites = {};
let terraformAvailable = false;

const sitesRaw = runTerraform(['output', '-json', 'sites']);
if (sitesRaw) {
  terraformSites = JSON.parse(sitesRaw);
  terraformAvailable = true;
} else {
  console.warn(
    'build-platform-manifest: no terraform output — preserving contracts from existing manifest when available.'
  );
}

const terraformAuthoritative = terraformOutputIsAuthoritative(terraformAvailable, terraformSites);
if (terraformAvailable && !terraformAuthoritative) {
  console.warn(
    'build-platform-manifest: terraform output holds no sites — preserving committed contracts rather than treating state as empty.'
  );
}

/** @type {Record<string, string>} */
const platformMeta = {
  githubRepo: 'marklovely/home-dashboard'
};

for (const [key, outputName, parser] of [
  ['cloudflareAccountId', 'cloudflare_account_id', (v) => v.trim()],
  ['accessTeamDomain', 'access_team_domain', (v) => v.trim()],
  ['zoneName', 'zone_name', (v) => v.trim()],
  ['customerZoneName', 'customer_zone_name', (v) => v.trim()]
]) {
  const value = runTerraform(['output', '-raw', outputName]);
  if (value) {
    platformMeta[key] = parser(value);
  }
}

const adminRaw = runTerraform(['output', '-json', 'platform_admin']);
if (adminRaw) {
  try {
    const admin = JSON.parse(adminRaw);
    if (admin?.cf_access_team_domain) {
      platformMeta.accessTeamDomain = admin.cf_access_team_domain;
    }
  } catch {
    /* optional */
  }
}

const marketingRaw = runTerraform(['output', '-json', 'marketing_site']);
if (marketingRaw) {
  try {
    const marketing = JSON.parse(marketingRaw);
    if (marketing?.access_app_id) {
      platformMeta.marketingAccessAppId = String(marketing.access_app_id);
    }
    if (marketing?.hostname) {
      platformMeta.marketingSiteOrigin = `https://${marketing.hostname}`;
    }
  } catch {
    /* optional */
  }
}

if (!platformMeta.cloudflareAccountId && process.env.CLOUDFLARE_ACCOUNT_ID?.trim()) {
  platformMeta.cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID.trim();
}

const preservedManifest = await loadPreservedManifest(outPath);
const mergedPlatform = mergePlatformMeta(
  platformMeta,
  /** @type {Record<string, string> | undefined} */ (preservedManifest?.platform)
);

const registry = loadSitesYaml(sitesYamlPath);
/** @type {Record<string, object>} */
const sites = {};
let preservedContractCount = 0;
/** @type {string[]} */
const droppedContractSites = [];

for (const [siteId, meta] of Object.entries(registry)) {
  const contract = resolveSiteContract(
    siteId,
    meta,
    terraformSites,
    /** @type {Record<string, { contract?: unknown }> | undefined} */ (preservedManifest?.sites),
    { terraformAvailable: terraformAuthoritative }
  );
  if (contract && !terraformSites[siteId]) {
    preservedContractCount += 1;
  }
  if (!contract && hasTerraformContract(preservedManifest?.sites?.[siteId]?.contract)) {
    droppedContractSites.push(siteId);
  }
  const hostname = String(meta.hostname ?? '');
  const fields = siteManifestFields(siteId, contract, hostname);
  // Owner and sitter emails are deliberately absent: this file is committed to
  // a public repo. Platform admin reads them from the billing API instead.
  sites[siteId] = redactEmailFields({
    siteId,
    hostname,
    hubEnvironment: meta.hub_environment ?? siteId,
    vanilla: Boolean(meta.vanilla),
    terraform: Boolean(meta.terraform),
    attachHubApiBinding: meta.attach_hub_api_binding === true,
    hasOwnerEmails: parseEmailList(meta.owner_emails).length > 0,
    demoPublic: meta.demo_public === true,
    accessEnabled: meta.access_enabled !== false,
    ...fields,
    contract,
    provisioning: buildProvisioningChecklist(siteId, meta, contract)
  });
}

const manifest = {
  generatedAt: new Date().toISOString(),
  platform: mergedPlatform,
  sites
};

const leakedEmails = findEmailAddresses(manifest);
if (leakedEmails.length > 0) {
  console.error(
    `build-platform-manifest: refusing to write personal data to a committed file (${leakedEmails.length} email address(es) found).`
  );
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(manifest, null, 2)}\n`);

const tfSiteCount = Object.keys(terraformSites).length;
console.log(
  `Wrote ${outPath} (${Object.keys(sites).length} sites, terraform=${terraformAvailable ? tfSiteCount : 'unavailable'}, preservedContracts=${preservedContractCount})`
);
if (droppedContractSites.length > 0) {
  console.log(
    `build-platform-manifest: dropped stale contract for ${droppedContractSites.join(', ')} — not in Terraform output.`
  );
}

/**
 * @param {string} manifestPath
 */
async function loadPreservedManifest(manifestPath) {
  if (existsSync(manifestPath)) {
    try {
      return JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch (error) {
      console.warn(
        `build-platform-manifest: could not read ${manifestPath} (${error instanceof Error ? error.message : 'unknown'}).`
      );
    }
  }

  const fallbackUrl = process.env.PLATFORM_MANIFEST_FALLBACK_URL?.trim();
  if (!fallbackUrl) return null;

  try {
    const response = await fetch(fallbackUrl, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      console.warn(`build-platform-manifest: fallback fetch failed (${response.status}) ${fallbackUrl}`);
      return null;
    }
    console.warn(`build-platform-manifest: using fallback manifest from ${fallbackUrl}`);
    return await response.json();
  } catch (error) {
    console.warn(
      `build-platform-manifest: fallback fetch error (${error instanceof Error ? error.message : 'unknown'}).`
    );
    return null;
  }
}

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
    label: contract
      ? 'Terraform contract in platform manifest'
      : 'Terraform contract in platform manifest (rebuild after apply)',
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
    const publicDemo = meta.demo_public === true || meta.access_enabled === false;
    steps.push({
      id: 'access-probe',
      label: publicDemo
        ? 'Public demo gate (DEMO_PUBLIC on Pages)'
        : 'Access + API probe healthy',
      done: null
    });
  }
  return steps;
}

/**
 * @param {string[]} args
 */
function runTerraform(args) {
  if (!terraformAvailable && args[2] !== 'sites') {
    return null;
  }
  try {
    return execFileSync('terraform', args, {
      cwd: tfDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
  } catch {
    return null;
  }
}
