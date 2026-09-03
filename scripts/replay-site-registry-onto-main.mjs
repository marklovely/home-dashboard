#!/usr/bin/env node
/**
 * CI helper: take this checkout's snapshot of one site and replay it onto
 * origin/main so a registry PR does not drop sites added while the job ran.
 *
 * Usage:
 *   node scripts/replay-site-registry-onto-main.mjs <site_id>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  overlaySiteRegistryFiles,
  REGISTRY_OVERLAY_FILES
} from './lib/overlay-site-registry.mjs';
import { gitResetToOriginMain } from './lib/git-reset-origin-main.mjs';
import { validateSiteId } from './lib/site-registry.mjs';

const siteId = String(process.argv[2] ?? '').trim();
const idError = validateSiteId(siteId);
if (idError) {
  console.error(idError);
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** @type {Record<string, string>} */
const sourceFiles = {};
for (const relative of REGISTRY_OVERLAY_FILES) {
  sourceFiles[relative] = readFileSync(join(root, relative), 'utf8');
}

gitResetToOriginMain({
  cwd: root,
  token: process.env.PLATFORM_GITHUB_TOKEN || process.env.GH_TOKEN,
  repository: process.env.GITHUB_REPOSITORY
});

/** @type {Record<string, string>} */
const baseFiles = {};
for (const relative of REGISTRY_OVERLAY_FILES) {
  baseFiles[relative] = readFileSync(join(root, relative), 'utf8');
}

const nextFiles = overlaySiteRegistryFiles(siteId, baseFiles, sourceFiles);
for (const [relative, contents] of Object.entries(nextFiles)) {
  const dest = join(root, relative);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, contents);
}
console.log(`Replayed ${siteId} registry snapshot onto origin/main.`);
