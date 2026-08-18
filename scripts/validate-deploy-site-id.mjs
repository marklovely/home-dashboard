#!/usr/bin/env node
/**
 * Validate site_id before worker deploy in GitHub Actions.
 * Exits 0 and prints site id to GITHUB_OUTPUT when valid.
 */
import { readFileSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateDeploySiteId } from './lib/site-registry.mjs';

const siteId = String(process.env.SITE_ID ?? '').trim();
const deployError = validateDeploySiteId(siteId);
if (deployError) {
  console.error(deployError);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'worker/package.json'), 'utf8'));
const scripts = pkg.scripts ?? {};

if (!scripts[`deploy:${siteId}`]) {
  console.error(`No deploy:${siteId} script in worker/package.json.`);
  process.exit(1);
}

if (!scripts[`d1:migrate:${siteId}`]) {
  console.error(`No d1:migrate:${siteId} script in worker/package.json.`);
  process.exit(1);
}

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `site_id=${siteId}\n`);
}

console.log(`Validated deploy site_id=${siteId}`);
