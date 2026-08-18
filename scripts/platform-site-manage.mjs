#!/usr/bin/env node
/**
 * Patch repo files for platform site create / update / delete.
 * Used by GitHub Actions (platform-site-manage.yml) and local dry-run.
 *
 * Usage:
 *   node scripts/platform-site-manage.mjs create --site-id demo --hostname demo.lovely-home.co.uk
 *   node scripts/platform-site-manage.mjs update --site-id demo --vanilla false
 *   node scripts/platform-site-manage.mjs delete --site-id demo
 *   node scripts/platform-site-manage.mjs create ... --dry-run
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import {
  defaultSiteEntry,
  suggestedPagesProject,
  suggestedWorkerName,
  validateSiteMutation
} from './lib/site-registry.mjs';
import { formatSitesYaml } from './lib/write-sites-yaml.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sitesYamlPath = join(root, 'platform/sites.yaml');
const wranglerPath = join(root, 'worker/wrangler.toml');
const workerPackagePath = join(root, 'worker/package.json');
const hubExamplePath = join(root, 'terraform/environments/hub.tfvars.example');
const zoneName = 'lovely-home.co.uk';

/** @type {Record<string, string | boolean | undefined>} */
const args = parseArgs(process.argv.slice(2));
const action = String(args._[0] ?? '');
const dryRun = args['dry-run'] === true || args['dry-run'] === 'true';
const siteId = String(args['site-id'] ?? '');
const confirmHostname = String(args['confirm-hostname'] ?? '');

/** @type {Partial<import('./lib/site-registry.mjs').SiteRegistryEntry>} */
const payload = {
  hostname: args.hostname ? String(args.hostname) : undefined,
  hub_environment: args['hub-environment'] ? String(args['hub-environment']) : undefined,
  vanilla: parseOptionalBool(args.vanilla),
  terraform: parseOptionalBool(args.terraform),
  attach_hub_api_binding: parseOptionalBool(args['attach-hub-api-binding'])
};

const existing = loadSitesYaml(sitesYamlPath);

if (action === 'create') {
  Object.assign(payload, defaultSiteEntry(siteId, payload, zoneName));
}

const error = validateSiteMutation(
  /** @type {import('./lib/site-registry.mjs').SiteAction} */ (action),
  siteId,
  payload,
  existing,
  { zoneName }
);
if (error) {
  console.error(error);
  process.exit(1);
}

if (action === 'delete' && confirmHostname !== existing[siteId]?.hostname) {
  console.error('Delete requires --confirm-hostname matching the site hostname.');
  process.exit(1);
}

/** @type {Record<string, Record<string, string | boolean>>} */
const nextSites = { ...existing };

if (action === 'create') {
  nextSites[siteId] = defaultSiteEntry(siteId, payload, zoneName);
} else if (action === 'update') {
  nextSites[siteId] = {
    ...existing[siteId],
    ...(payload.hostname !== undefined ? { hostname: payload.hostname } : {}),
    ...(payload.hub_environment !== undefined ? { hub_environment: payload.hub_environment } : {}),
    ...(payload.vanilla !== undefined ? { vanilla: payload.vanilla } : {}),
    ...(payload.terraform !== undefined ? { terraform: payload.terraform } : {}),
    ...(payload.attach_hub_api_binding !== undefined
      ? { attach_hub_api_binding: payload.attach_hub_api_binding }
      : {})
  };
} else if (action === 'delete') {
  delete nextSites[siteId];
}

const changes = {
  sitesYaml: formatSitesYaml(nextSites),
  wranglerToml: patchWranglerToml(readFileSync(wranglerPath, 'utf8'), action, siteId, nextSites[siteId]),
  hubTfvarsExample: patchHubTfvarsExample(readFileSync(hubExamplePath, 'utf8'), action, siteId, nextSites[siteId]),
  workerPackageJson: patchWorkerPackageJson(readFileSync(workerPackagePath, 'utf8'), action, siteId)
};

const summary = buildSummary(action, siteId, nextSites[siteId], existing[siteId]);

if (dryRun) {
  console.log(JSON.stringify({ ok: true, dryRun: true, action, siteId, summary, changes }, null, 2));
  process.exit(0);
}

writeFileSync(sitesYamlPath, changes.sitesYaml);
writeFileSync(wranglerPath, changes.wranglerToml);
writeFileSync(hubExamplePath, changes.hubTfvarsExample);
writeFileSync(workerPackagePath, changes.workerPackageJson);

console.log(JSON.stringify({ ok: true, action, siteId, summary }, null, 2));

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean | string[]>} */
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      out['dry-run'] = true;
      continue;
    }
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i += 1;
      }
      continue;
    }
    /** @type {string[]} */ (out._).push(token);
  }
  return out;
}

/**
 * @param {string | boolean | undefined} value
 */
function parseOptionalBool(value) {
  if (value === undefined) return undefined;
  if (value === true) return true;
  const text = String(value).trim().toLowerCase();
  if (text === 'true') return true;
  if (text === 'false') return false;
  return undefined;
}

/**
 * @param {string} text
 * @param {string} action
 * @param {string} siteId
 * @param {Record<string, string | boolean> | undefined} entry
 */
function patchWranglerToml(text, action, siteId, entry) {
  if (siteId === 'production') return text;

  const blockRe = new RegExp(
    `# ---------------------------------------------------------------------------\\n# ${capitalize(siteId)} environment[\\s\\S]*?(?=\\n# ---------------------------------------------------------------------------|\\n*$)`,
    'm'
  );

  if (action === 'delete') {
    return text.replace(blockRe, '').replace(/\n{3,}/g, '\n\n');
  }

  const block = renderWranglerEnvBlock(siteId, entry);
  if (blockRe.test(text)) {
    return text.replace(blockRe, block.trimEnd());
  }

  return `${text.trimEnd()}\n\n${block}\n`;
}

/**
 * @param {string} text
 * @param {string} action
 * @param {string} siteId
 */
function patchWorkerPackageJson(text, action, siteId) {
  if (siteId === 'production') return text;
  const pkg = JSON.parse(text);
  const scripts = { ...pkg.scripts };

  if (action === 'delete') {
    delete scripts[`deploy:${siteId}`];
    delete scripts[`d1:migrate:${siteId}`];
    delete scripts[`secrets:${siteId}`];
    delete scripts[`provision:${siteId}`];
  } else if (action === 'create' || action === 'update') {
    scripts[`deploy:${siteId}`] =
      `node scripts/check-env-provisioned.mjs ${siteId} && wrangler deploy --env ${siteId}`;
    scripts[`d1:migrate:${siteId}`] =
      `node scripts/check-env-provisioned.mjs ${siteId} && wrangler d1 migrations apply lovely-home-appliance-manuals-${siteId} --remote --env ${siteId}`;
    scripts[`secrets:${siteId}`] = `bash scripts/print-env-secrets-checklist.sh ${siteId}`;
  }

  return `${JSON.stringify({ ...pkg, scripts }, null, 2)}\n`;
}

/**
 * @param {string} siteId
 * @param {Record<string, string | boolean> | undefined} entry
 */
function renderWranglerEnvBlock(siteId, entry) {
  const hostname = String(entry?.hostname ?? `${siteId}.${zoneName}`);
  const pagesProject = suggestedPagesProject(siteId);
  const workerName = suggestedWorkerName(siteId);
  const label = capitalize(siteId);

  return `# ---------------------------------------------------------------------------
# ${label} environment — Terraform-managed (see docs/platform-terraform.md)
# Provision: terraform apply + node scripts/sync-wrangler-from-terraform.mjs ${siteId}
# ---------------------------------------------------------------------------

[env.${siteId}]
name = "${workerName}"

[env.${siteId}.vars]
HUB_ENVIRONMENT = "${siteId}"
ALLOWED_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173,http://127.0.0.1:4173,https://${hostname},https://${pagesProject}.pages.dev,https://*.${pagesProject}.pages.dev,https://*.pages.dev"
HOME_LATITUDE = "51.5074"
HOME_LONGITUDE = "-0.1278"

[[env.${siteId}.durable_objects.bindings]]
name = "OWNER_AUTH_LIMITER"
class_name = "OwnerAuthLimiter"

[[env.${siteId}.durable_objects.bindings]]
name = "CONTROL_ACTION_LIMITER"
class_name = "ControlActionLimiter"

[[env.${siteId}.r2_buckets]]
binding = "APPLIANCE_GUIDES"
bucket_name = "lovely-home-appliance-guides-${siteId}"

[[env.${siteId}.d1_databases]]
binding = "APPLIANCE_MANUALS_DB"
database_name = "lovely-home-appliance-manuals-${siteId}"
database_id = "REPLACE_AFTER_TERRAFORM_APPLY"
migrations_dir = "migrations"

[[env.${siteId}.d1_databases]]
binding = "HOUSE_GUIDE_DB"
database_name = "lovely-home-appliance-manuals-${siteId}"
database_id = "REPLACE_AFTER_TERRAFORM_APPLY"
migrations_dir = "migrations"

[[env.${siteId}.r2_buckets]]
binding = "GUIDE_MEDIA"
bucket_name = "lovely-home-guide-media-${siteId}"`;
}

/**
 * @param {string} text
 * @param {string} action
 * @param {string} siteId
 * @param {Record<string, string | boolean> | undefined} entry
 */
function patchHubTfvarsExample(text, action, siteId, entry) {
  const blockRe = new RegExp(`\\n  ${siteId} = \\{[\\s\\S]*?\\n  \\}`, 'm');

  if (action === 'delete') {
    return text.replace(blockRe, '\n');
  }

  const attachBinding = entry?.attach_hub_api_binding === true;
  const vanilla = entry?.vanilla !== false;
  const block = `
  ${siteId} = {
    hostname        = "${entry?.hostname ?? `${siteId}.${zoneName}`}"
    hub_environment = "${entry?.hub_environment ?? siteId}"
    vanilla         = ${vanilla ? 'true' : 'false'}
    terraform       = true${attachBinding ? '' : '\n    attach_hub_api_binding = false # first apply only; set true after Worker deploy'}
  }`;

  if (blockRe.test(text)) {
    return text.replace(blockRe, block);
  }

  const insertAt = text.lastIndexOf('\n}');
  if (insertAt === -1) return text;
  return `${text.slice(0, insertAt)}${block}\n${text.slice(insertAt)}`;
}

/**
 * @param {string} action
 * @param {string} siteId
 * @param {Record<string, string | boolean> | undefined} nextEntry
 * @param {Record<string, string | boolean> | undefined} prevEntry
 */
function buildSummary(action, siteId, nextEntry, prevEntry) {
  const lines = [];
  if (action === 'create') {
    lines.push(`Add site "${siteId}" to platform/sites.yaml and hub.tfvars.example.`);
    lines.push(`Append wrangler [env.${siteId}] stub (database_id placeholders).`);
    lines.push('After merge: add matching block to terraform/environments/hub.tfvars, then terraform apply.');
    lines.push(`Then: node scripts/sync-wrangler-from-terraform.mjs ${siteId}`);
    lines.push(`Then: cd worker && npm run d1:migrate:${siteId} && npm run deploy:${siteId}`);
  } else if (action === 'update') {
    lines.push(`Update site "${siteId}" registry metadata.`);
    if (prevEntry?.hostname !== nextEntry?.hostname) {
      lines.push('Hostname changed — review Access apps and DNS after terraform apply.');
    }
  } else {
    lines.push(`Remove site "${siteId}" from registry and wrangler example blocks.`);
    lines.push(
      `Run: terraform destroy -var-file=environments/hub.tfvars -target='module.hub_site["${siteId}"]'`
    );
    lines.push('Remove the site block from your local hub.tfvars manually.');
  }
  return lines;
}

/**
 * @param {string} value
 */
function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
