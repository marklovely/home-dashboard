#!/usr/bin/env node
/**
 * Create (or update) the GitHub Release for the current tag from CHANGELOG.md.
 * Used by .github/workflows/release.yml
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { changelogNotesForVersion } from './lib/changelog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tag = String(process.env.GITHUB_REF_NAME ?? process.argv[2] ?? '')
  .trim()
  .replace(/^refs\/tags\//, '');
const version = tag.replace(/^v/i, '');

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Expected a vX.Y.Z tag (GITHUB_REF_NAME or argv).');
  process.exit(1);
}

const notes = changelogNotesForVersion(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), version);
if (!notes) {
  console.error(`No CHANGELOG.md section for ${version}.`);
  process.exit(1);
}

const title = firstHeading(notes) || `Lovely Home ${version}`;
try {
  execFileSync('gh', ['release', 'view', tag], { cwd: root, stdio: 'pipe' });
  execFileSync('gh', ['release', 'edit', tag, '--title', title, '--notes', notes], {
    cwd: root,
    stdio: 'inherit'
  });
  console.log(`Updated GitHub Release ${tag}.`);
} catch {
  execFileSync('gh', ['release', 'create', tag, '--title', title, '--notes', notes], {
    cwd: root,
    stdio: 'inherit'
  });
  console.log(`Created GitHub Release ${tag}.`);
}

/**
 * @param {string} notes
 */
function firstHeading(notes) {
  const line = notes.split('\n').find((entry) => entry.trim() && !entry.startsWith('#'));
  if (!line) return '';
  const summary = line.replace(/^Minor release:\s*/i, '').replace(/^Major release:\s*/i, '').trim();
  return summary ? `v${version} — ${truncate(summary, 72)}` : `v${version}`;
}

/**
 * @param {string} text
 * @param {number} max
 */
function truncate(text, max) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trim()}…`;
}
