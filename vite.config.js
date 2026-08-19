import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'src',
  envDir: projectRoot,
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});


