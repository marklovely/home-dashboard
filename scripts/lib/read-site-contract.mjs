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

/**
 * @param {string} name
 */
function readTerraformOutput(name) {
  const raw = execFileSync('terraform', ['output', '-json', name], {
    cwd: tfDir,
    encoding: 'utf8',
    timeout: 5000
  });
  return parseTerraformJsonOutput(raw);
}

/**
 * @param {string} siteId
 * @returns {{ site: Record<string, unknown>, source: 'terraform' | 'manifest' | 'registry' } | null}
 */
export function readSiteContract(siteId) {
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
      timeout: 5000
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
