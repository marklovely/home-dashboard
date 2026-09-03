#!/usr/bin/env node
/**
 * CI helper: find open dirty automated platform PRs and replay each onto main.
 *
 * Usage:
 *   node scripts/reconcile-dirty-platform-prs.mjs
 */
import { execFileSync } from 'node:child_process';
import { siteIdFromPlatformPrTitle } from './lib/platform-pr-site-id.mjs';

const prs = JSON.parse(
  execFileSync(
    'gh',
    ['pr', 'list', '--base', 'main', '--state', 'open', '--limit', '50', '--json', 'number,title,headRefName'],
    { encoding: 'utf8' }
  )
);

let replayed = 0;
for (const pr of prs) {
  if (!siteIdFromPlatformPrTitle(pr.title)) continue;
  if (!String(pr.headRefName ?? '').startsWith('platform/')) continue;
  execFileSync(process.execPath, ['scripts/replay-dirty-platform-pr.mjs', String(pr.number)], {
    stdio: 'inherit',
    env: process.env
  });
  replayed += 1;
}

console.log(`Checked ${replayed} automated platform PR(s) for registry overlay.`);
