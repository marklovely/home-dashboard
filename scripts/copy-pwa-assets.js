import { copyFileSync, cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const distDir = join(projectRoot, 'dist');
const srcDir = join(projectRoot, 'src');
const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'));

mkdirSync(distDir, { recursive: true });

const serviceWorkerSource = readFileSync(join(srcDir, 'service-worker.js'), 'utf8').replaceAll(
  '__APP_VERSION__',
  pkg.version
);
writeFileSync(join(distDir, 'service-worker.js'), serviceWorkerSource);

copyFileSync(join(srcDir, 'manifest.webmanifest'), join(distDir, 'manifest.webmanifest'));
cpSync(join(srcDir, 'icons'), join(distDir, 'icons'), { recursive: true });

console.log(`Copied PWA shell assets to dist/ (service worker cache: home-dashboard-v${pkg.version})`);
