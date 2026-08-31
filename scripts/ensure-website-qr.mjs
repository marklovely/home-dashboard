#!/usr/bin/env node
/**
 * Rebuild website/vendor/lovely-qr.js when Vite/Rollup can run; otherwise keep
 * the committed bundle so a marketing deploy is not blocked by npm's optional
 * native-dep bug.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  websiteQrAfterFailedRebuild,
  websiteQrRebuildPlan
} from './lib/website-qr-rebuild.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const plan = await websiteQrRebuildPlan({ rootDir: root });

if (plan.action === 'rebuild') {
  console.log('==> Rebuilding website/vendor/lovely-qr.js');
  const result = spawnSync(process.execPath, ['scripts/build-website-qr.mjs'], {
    cwd: root,
    stdio: 'inherit'
  });
  if (result.status === 0) {
    process.exit(0);
  }
  const fallback = websiteQrAfterFailedRebuild(existsSync(plan.vendorPath));
  if (fallback.action === 'use-committed') {
    console.warn(
      '==> QR bundle rebuild failed. Using committed website/vendor/lovely-qr.js'
    );
    process.exit(0);
  }
  process.exit(result.status ?? 1);
}

if (plan.action === 'use-committed') {
  if (plan.reason === 'rollup-unusable') {
    console.log(
      '==> Skipping QR bundle rebuild — Rollup native binary is missing in this node_modules. Using committed website/vendor/lovely-qr.js'
    );
    console.log(
      '    To regenerate: npm i @rollup/rollup-$(node -p "process.platform + \'-\' + process.arch") && npm run build:website-qr'
    );
  } else {
    console.log(
      '==> Skipping QR bundle rebuild (node_modules missing) — using committed website/vendor/lovely-qr.js'
    );
  }
  process.exit(0);
}

console.error(
  'Missing website/vendor/lovely-qr.js and cannot rebuild it. Run npm ci && npm run build:website-qr'
);
process.exit(1);
