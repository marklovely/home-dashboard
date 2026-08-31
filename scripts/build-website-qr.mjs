/**
 * Bundles the QR encoder for the static marketing site.
 *
 * website/ is uploaded to Cloudflare Pages as-is (no build step), so the
 * generated bundle is committed. Run this whenever qrcode or
 * src/lib/qrLogoBadge.js changes:
 *
 *   npm run build:website-qr
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

await build({
  configFile: false,
  logLevel: 'warn',
  build: {
    emptyOutDir: false,
    outDir: resolve(projectRoot, 'website/vendor'),
    lib: {
      entry: resolve(projectRoot, 'scripts/website/lovely-qr.entry.js'),
      name: 'LovelyHomeQr',
      formats: ['iife'],
      fileName: () => 'lovely-qr.js'
    }
  }
});

console.log('Wrote website/vendor/lovely-qr.js');
