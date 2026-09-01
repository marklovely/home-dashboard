#!/usr/bin/env node
/**
 * Hub Pages must not ship platform/stripe/public Functions — those routes
 * shadow HUB_API and 404 GET /api/platform/site-archive on customer hubs.
 *
 * Usage:
 *   node scripts/prune-hub-pages-functions.mjs
 *     In-place (Cloudflare Pages GitHub build for a hub project).
 *   node scripts/prune-hub-pages-functions.mjs --out dist-hub-functions/functions
 *     Copy hub-only Functions into ./functions for Wrangler 4 pages deploy.
 */
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const source = join(root, 'functions');
const outFlag = process.argv.indexOf('--out');
const rawOut = outFlag >= 0 ? process.argv[outFlag + 1] || 'dist-hub-functions' : '';
const dest =
  outFlag >= 0 ? (isAbsolute(rawOut) ? rawOut : join(root, rawOut)) : source;

const drop = ['api/platform', 'api/stripe', 'api/public'];

if (!existsSync(source)) {
  console.error('No functions/ directory to prune.');
  process.exit(1);
}

if (dest !== source) {
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(source, dest, { recursive: true });
}

for (const rel of drop) {
  rmSync(join(dest, rel), { recursive: true, force: true });
}

console.log(`Hub Pages Functions pruned (${dest === source ? 'in-place' : dest}).`);
