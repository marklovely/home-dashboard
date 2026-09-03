/**
 * Apply one site's registry snapshot onto a newer origin/main tree.
 *
 * Concurrent signups and provision follow-ups all edit the same yaml/toml
 * files. A 3-way merge of those PRs conflicts even when they touch different
 * sites. Overlaying only `siteId` from the source snapshot keeps every other
 * site from the base (latest main).
 */
import { parseSitesYaml } from './load-sites-yaml.mjs';
import { formatSitesYaml } from './write-sites-yaml.mjs';
import { removeHubTfvarsSiteBlock } from './prune-hub-site-config.mjs';
import {
  replaceWranglerEnvBlock,
  removeWranglerEnvBlock,
  wranglerEnvBlockRegExp
} from './wrangler-env-block.mjs';

export const REGISTRY_OVERLAY_FILES = [
  'platform/sites.yaml',
  'worker/wrangler.toml',
  'worker/package.json',
  'terraform/environments/hub.tfvars.example',
  'platform-admin/public/platform-manifest.json'
];

const WORKER_SCRIPT_PREFIXES = ['deploy:', 'd1:migrate:', 'secrets:', 'provision:'];

/**
 * @param {string} siteId
 */
function workerScriptKeys(siteId) {
  return WORKER_SCRIPT_PREFIXES.map((prefix) => `${prefix}${siteId}`);
}

/**
 * @param {string} siteId
 * @param {string} text
 */
export function extractWranglerEnvBlock(text, siteId) {
  const match = text.match(wranglerEnvBlockRegExp(siteId));
  return match ? match[0].trimEnd() : null;
}

/**
 * @param {string} siteId
 * @param {string} text
 */
function extractHubTfvarsSiteBlock(text, siteId) {
  const escaped = siteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(new RegExp(`\\n  ${escaped} = \\{[\\s\\S]*?\\n  \\}`, 'm'));
  return match ? match[0] : null;
}

/**
 * @param {string} siteId
 * @param {string} baseText
 * @param {string} sourceText
 */
export function overlaySitesYaml(siteId, baseText, sourceText) {
  const base = parseSitesYaml(baseText);
  const source = parseSitesYaml(sourceText);
  if (source[siteId]) base[siteId] = source[siteId];
  else delete base[siteId];
  return formatSitesYaml(base);
}

/**
 * @param {string} siteId
 * @param {string} baseText
 * @param {string} sourceText
 */
export function overlayWranglerToml(siteId, baseText, sourceText) {
  const sourceBlock = extractWranglerEnvBlock(sourceText, siteId);
  if (sourceBlock) return `${replaceWranglerEnvBlock(baseText, siteId, sourceBlock).trimEnd()}\n`;
  return removeWranglerEnvBlock(baseText, siteId).text;
}

/**
 * @param {string} siteId
 * @param {string} baseText
 * @param {string} sourceText
 */
export function overlayWorkerPackageJson(siteId, baseText, sourceText) {
  const basePkg = JSON.parse(baseText);
  const sourcePkg = JSON.parse(sourceText);
  const scripts = { ...(basePkg.scripts ?? {}) };
  const sourceScripts = sourcePkg.scripts ?? {};
  for (const key of workerScriptKeys(siteId)) {
    if (sourceScripts[key]) scripts[key] = sourceScripts[key];
    else delete scripts[key];
  }
  return `${JSON.stringify({ ...basePkg, scripts }, null, 2)}\n`;
}

/**
 * @param {string} siteId
 * @param {string} baseText
 * @param {string} sourceText
 */
export function overlayHubTfvarsExample(siteId, baseText, sourceText) {
  const sourceBlock = extractHubTfvarsSiteBlock(sourceText, siteId);
  const stripped = removeHubTfvarsSiteBlock(baseText, siteId).text;
  if (!sourceBlock) return stripped;
  const insertAt = stripped.lastIndexOf('\n}');
  if (insertAt === -1) return `${stripped.trimEnd()}${sourceBlock}\n`;
  return `${stripped.slice(0, insertAt)}${sourceBlock}\n${stripped.slice(insertAt)}`;
}

/**
 * @param {string} siteId
 * @param {string} baseText
 * @param {string} sourceText
 */
export function overlayPlatformManifest(siteId, baseText, sourceText) {
  const base = JSON.parse(baseText);
  const source = JSON.parse(sourceText);
  const sites = { ...(base.sites ?? {}) };
  if (source.sites && Object.prototype.hasOwnProperty.call(source.sites, siteId)) {
    sites[siteId] = source.sites[siteId];
  } else {
    delete sites[siteId];
  }
  return `${JSON.stringify({ ...base, sites }, null, 2)}\n`;
}

/**
 * @param {string} siteId
 * @param {Record<string, string>} baseFiles
 * @param {Record<string, string>} sourceFiles
 * @returns {Record<string, string>}
 */
export function overlaySiteRegistryFiles(siteId, baseFiles, sourceFiles) {
  return {
    'platform/sites.yaml': overlaySitesYaml(
      siteId,
      baseFiles['platform/sites.yaml'],
      sourceFiles['platform/sites.yaml']
    ),
    'worker/wrangler.toml': overlayWranglerToml(
      siteId,
      baseFiles['worker/wrangler.toml'],
      sourceFiles['worker/wrangler.toml']
    ),
    'worker/package.json': overlayWorkerPackageJson(
      siteId,
      baseFiles['worker/package.json'],
      sourceFiles['worker/package.json']
    ),
    'terraform/environments/hub.tfvars.example': overlayHubTfvarsExample(
      siteId,
      baseFiles['terraform/environments/hub.tfvars.example'],
      sourceFiles['terraform/environments/hub.tfvars.example']
    ),
    'platform-admin/public/platform-manifest.json': overlayPlatformManifest(
      siteId,
      baseFiles['platform-admin/public/platform-manifest.json'],
      sourceFiles['platform-admin/public/platform-manifest.json']
    )
  };
}
