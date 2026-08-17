#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

await import('./build-platform-manifest.mjs');

/** @type {import('node:child_process').ChildProcess[]} */
const children = [];

function run(command, args) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit' });
  children.push(child);
  return child;
}

run('node', ['scripts/platform-admin-dev-api.mjs']);
run('npx', ['vite', '--config', 'vite.platform.config.js', '--host', '0.0.0.0']);

function shutdown() {
  for (const child of children) child.kill('SIGTERM');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
