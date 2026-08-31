#!/usr/bin/env node
/**
 * Cut a numbered release from CHANGELOG Unreleased + package.json.
 *
 * Usage:
 *   node scripts/cut-release.mjs 2.3.0
 *   node scripts/cut-release.mjs 2.3.0 --publish
 *
 * --publish commits, tags vX.Y.Z, and pushes. The Release workflow then
 * publishes GitHub Release notes from CHANGELOG.md.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import {
  changelogUnreleasedNotes,
  promoteChangelogUnreleased
} from './lib/changelog.mjs';
import { writeWebsiteVersion } from './lib/website-version.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const version = String(process.argv[2] ?? '')
  .trim()
  .replace(/^v/i, '');
const publish = process.argv.includes('--publish');

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  console.error('Usage: node scripts/cut-release.mjs <x.y.z> [--publish]');
  process.exit(1);
}

const changelogPath = join(root, 'CHANGELOG.md');
const pkgPath = join(root, 'package.json');
const changelog = readFileSync(changelogPath, 'utf8');
const unreleased = changelogUnreleasedNotes(changelog);
const nextChangelog = promoteChangelogUnreleased(changelog, version, unreleased);

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
pkg.version = version;

writeFileSync(changelogPath, nextChangelog);
writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
writeWebsiteVersion(root, version);

console.log(`Updated package.json, CHANGELOG.md, and website/version.json to ${version}.`);

if (!publish) {
  console.log(`Commit, then tag and publish:\n  git add package.json CHANGELOG.md website/version.json\n  git commit -m "Release ${version}"\n  git tag v${version}\n  git push origin HEAD && git push origin v${version}`);
  process.exit(0);
}

execFileSync('git', ['add', 'package.json', 'CHANGELOG.md', 'website/version.json'], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['commit', '-m', `Release ${version}`], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['tag', `v${version}`], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['push', 'origin', 'HEAD'], { cwd: root, stdio: 'inherit' });
execFileSync('git', ['push', 'origin', `v${version}`], { cwd: root, stdio: 'inherit' });
console.log(`Tagged v${version}. GitHub Release workflow publishes notes from CHANGELOG.md.`);
