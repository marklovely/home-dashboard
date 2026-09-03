#!/usr/bin/env node
/**
 * Read terraform output -json sites / hub_proxy_secrets for shell scripts.
 * Falls back to platform manifest, registry naming, and state pull when root
 * outputs are missing (per-site customer Terraform state).
 *
 * Usage:
 *   node scripts/lib/terraform-site-output.mjs site sandbox
 *   node scripts/lib/terraform-site-output.mjs hub-environment sandbox
 *   node scripts/lib/terraform-site-output.mjs hub-proxy-secret sandbox
 */
import { readHubProxySecret, readSiteContract } from './read-site-contract.mjs';

const mode = process.argv[2]?.trim();
const siteId = process.argv[3]?.trim();

if (!mode || !siteId) {
  console.error(
    'Usage: node scripts/lib/terraform-site-output.mjs <site|hub-environment|hub-proxy-secret> <site_id>'
  );
  process.exit(1);
}

try {
  if (mode === 'site') {
    const resolved = readSiteContract(siteId);
    if (!resolved) {
      console.error(`Site not in terraform output or manifest: ${siteId}`);
      process.exit(1);
    }
    if (resolved.source !== 'terraform') {
      console.warn(
        `terraform-site-output: using ${resolved.source} contract for "${siteId}" (terraform output "sites" unavailable).`
      );
    }
    console.log(JSON.stringify(resolved.site));
  } else if (mode === 'hub-environment') {
    const resolved = readSiteContract(siteId);
    const hubEnvironment = String(resolved?.site?.hub_environment ?? siteId).trim();
    console.log(hubEnvironment || siteId);
  } else if (mode === 'hub-proxy-secret') {
    console.log(readHubProxySecret(siteId));
  } else {
    console.error(`Unknown mode: ${mode}`);
    process.exit(1);
  }
} catch (error) {
  console.error('Run terraform apply first (from terraform/).', error.message);
  process.exit(1);
}
