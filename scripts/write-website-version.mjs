#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeWebsiteVersion } from './lib/website-version.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
writeWebsiteVersion(root, pkg.version);
console.log(`website/version.json ← ${pkg.version}`);
