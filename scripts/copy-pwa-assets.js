import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const distDir = join(projectRoot, 'dist');
const srcDir = join(projectRoot, 'src');

mkdirSync(distDir, { recursive: true });

copyFileSync(join(srcDir, 'service-worker.js'), join(distDir, 'service-worker.js'));
copyFileSync(join(srcDir, 'manifest.webmanifest'), join(distDir, 'manifest.webmanifest'));
cpSync(join(srcDir, 'icons'), join(distDir, 'icons'), { recursive: true });

console.log('Copied PWA shell assets to dist/');
