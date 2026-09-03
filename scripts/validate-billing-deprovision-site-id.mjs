#!/usr/bin/env node
/**
 * Validate site_id before billing-triggered deprovision in GitHub Actions.
 * The site may still be in yaml, or provisioned without a registry record yet.
 */
import { appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateBillingDeprovisionSiteId } from './lib/site-registry.mjs';

const siteId = String(process.env.SITE_ID ?? '').trim();
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registry = loadSitesYaml(join(root, 'platform/sites.yaml'));

const billingError = validateBillingDeprovisionSiteId(siteId, registry);
if (billingError) {
  console.error(billingError);
  process.exit(1);
}

const hostname = String(registry[siteId]?.hostname ?? `${siteId}.lovely-hub.com`).trim();
const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `site_id=${siteId}\n`);
  appendFileSync(githubOutput, `hostname=${hostname}\n`);
}

console.log(`Validated billing deprovision site_id=${siteId} hostname=${hostname}`);
