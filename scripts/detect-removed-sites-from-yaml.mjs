#!/usr/bin/env node
/**
 * Detect site ids removed in the latest commit to platform/sites.yaml.
 * Writes JSON array to GITHUB_OUTPUT (site_ids=...) for workflow matrix.
 */
import { appendFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { PROTECTED_SITE_IDS, validateSiteId } from './lib/site-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPath = join(root, 'platform/sites.yaml');
const tempPath = join(root, '.tmp-sites-prev.yaml');

/** @type {Record<string, Record<string, string | boolean>>} */
let before = {};
/** @type {Record<string, Record<string, string | boolean>>} */
const after = loadSitesYaml(yamlPath);

try {
  const previous = execFileSync('git', ['show', 'HEAD~1:platform/sites.yaml'], {
    cwd: root,
    encoding: 'utf8'
  });
  writeFileSync(tempPath, previous);
  before = loadSitesYaml(tempPath);
  unlinkSync(tempPath);
} catch (error) {
  console.error(
    'Could not read previous platform/sites.yaml from git (HEAD~1). Refusing to auto-deprovision — use workflow_dispatch with an explicit site_id instead.'
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

/** @type {string[]} */
const removed = [];
for (const siteId of Object.keys(before)) {
  if (after[siteId]) continue;
  if (before[siteId]?.terraform === false) continue;
  if (PROTECTED_SITE_IDS.has(siteId)) continue;
  if (validateSiteId(siteId)) continue;
  removed.push(siteId);
}

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `site_ids=${JSON.stringify(removed)}\n`);
}

console.log(`Removed terraform sites: ${removed.length ? removed.join(', ') : '(none)'}`);
