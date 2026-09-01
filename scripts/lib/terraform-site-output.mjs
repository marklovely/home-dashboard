#!/usr/bin/env node
/**
 * Read terraform output -json sites / hub_proxy_secrets for shell scripts.
 * Usage:
 *   node scripts/lib/terraform-site-output.mjs site sandbox
 *   node scripts/lib/terraform-site-output.mjs hub-environment sandbox
 *   node scripts/lib/terraform-site-output.mjs hub-proxy-secret sandbox
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseTerraformJsonOutput, terraformStringMap } from './terraform-output-json.mjs';

const mode = process.argv[2]?.trim();
const siteId = process.argv[3]?.trim();

if (!mode || !siteId) {
  console.error(
    'Usage: node scripts/lib/terraform-site-output.mjs <site|hub-environment|hub-proxy-secret> <site_id>'
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const tfDir = join(root, 'terraform');

function readTerraformOutput(name) {
  const raw = execFileSync('terraform', ['output', '-json', name], {
    cwd: tfDir,
    encoding: 'utf8'
  });
  return parseTerraformJsonOutput(raw);
}

try {
  if (mode === 'site') {
    const sites = /** @type {Record<string, { hub_environment?: string }>} */ (
      readTerraformOutput('sites') ?? {}
    );
    const site = sites[siteId];
    if (!site) {
      console.error(`Site not in terraform output: ${siteId}`);
      process.exit(1);
    }
    console.log(JSON.stringify(site));
  } else if (mode === 'hub-environment') {
    const sites = /** @type {Record<string, { hub_environment?: string }>} */ (
      readTerraformOutput('sites') ?? {}
    );
    const site = sites[siteId];
    console.log(site?.hub_environment ?? siteId);
  } else if (mode === 'hub-proxy-secret') {
    const secrets = terraformStringMap(readTerraformOutput('hub_proxy_secrets'));
    console.log(secrets[siteId] ?? '');
  } else {
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
  }
} catch (error) {
  console.error('Run terraform apply first (from terraform/).', error.message);
  process.exit(1);
}
