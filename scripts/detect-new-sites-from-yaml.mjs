#!/usr/bin/env node
/**
 * Detect site ids added in the latest commit to platform/sites.yaml.
 * Writes JSON array to GITHUB_OUTPUT (site_ids=...) for workflow matrix.
 */
import { appendFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSitesYaml } from './lib/load-sites-yaml.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

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
} catch {
  before = {};
}

/** @type {string[]} */
const added = [];
for (const siteId of Object.keys(after)) {
  if (before[siteId]) continue;
  if (after[siteId]?.terraform === false) continue;
  if (validateSiteId(siteId)) continue;
  added.push(siteId);
}

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `site_ids=${JSON.stringify(added)}\n`);
}

console.log(`New terraform sites: ${added.length ? added.join(', ') : '(none)'}`);
