/**
 * Read a hub site contract from terraform output with manifest/registry fallbacks.
 * Used when per-site customer state lacks root `sites` output.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveSiteArchiveContract } from './resolve-site-archive-contract.mjs';
import { parseHubProxySecretsFromTerraformState, parseTerraformJsonOutput, terraformStringMap } from './terraform-output-json.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const tfDir = join(root, 'terraform');
const TERRAFORM_SUBPROCESS_TIMEOUT_MS = 5000;

/** @type {Map<string, unknown>} */
const terraformOutputCache = new Map();
/** @type {Set<string>} */
const terraformOutputFailures = new Set();

/**
 * @param {string} name
 */
function readTerraformOutput(name) {
  if (terraformOutputCache.has(name)) {
    return terraformOutputCache.get(name);
  }
  if (terraformOutputFailures.has(name)) {
    throw new Error(`terraform output "${name}" unavailable (cached failure).`);
  }

  try {
    const raw = execFileSync('terraform', ['output', '-json', name], {
      cwd: tfDir,
      encoding: 'utf8',
      timeout: TERRAFORM_SUBPROCESS_TIMEOUT_MS
    });
    const parsed = parseTerraformJsonOutput(raw);
    terraformOutputCache.set(name, parsed);
    return parsed;
  } catch (error) {
    terraformOutputFailures.add(name);
    throw error;
  }
}

/**
 * @param {string} siteId
 * @returns {{ site: Record<string, unknown>, source: 'terraform' } | null}
 */
export function readSiteFromTerraformOutput(siteId) {
  try {
    const sites = /** @type {Record<string, Record<string, unknown>>} */ (
      readTerraformOutput('sites') ?? {}
    );
    const site = sites[siteId];
    if (site && typeof site === 'object') {
      return { site, source: 'terraform' };
    }
  } catch {
    // fall through
  }
  return null;
}

/**
 * @param {string} siteId
 * @returns {{ site: Record<string, unknown>, source: 'terraform' | 'manifest' | 'registry' } | null}
 */
export function readSiteContract(siteId) {
  const fromTerraform = readSiteFromTerraformOutput(siteId);
  if (fromTerraform) {
    return fromTerraform;
  }

  const resolved = resolveSiteArchiveContract(siteId);
  if (resolved?.site) {
    return { site: resolved.site, source: resolved.source };
  }
  return null;
}

/**
 * @param {string} siteId
 */
export function readHubProxySecret(siteId) {
  try {
    const secrets = terraformStringMap(readTerraformOutput('hub_proxy_secrets'));
    const fromOutput = secrets[siteId]?.trim();
    if (fromOutput) return fromOutput;
  } catch {
    // fall through
  }

  try {
    const raw = execFileSync('terraform', ['state', 'pull'], {
      cwd: tfDir,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      timeout: TERRAFORM_SUBPROCESS_TIMEOUT_MS
    });
    const fromState = parseHubProxySecretsFromTerraformState(raw)[siteId]?.trim();
    if (fromState) return fromState;
  } catch {
    // fall through
  }

  let envSecrets = {};
  if (process.env.HUB_PROXY_SECRETS_JSON?.trim()) {
    try {
      envSecrets = JSON.parse(process.env.HUB_PROXY_SECRETS_JSON);
    } catch {
      // ignore invalid JSON
    }
  }
  return String(envSecrets[siteId] ?? '').trim();
}
