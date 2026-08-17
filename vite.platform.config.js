import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const platformRoot = join(repoRoot, 'platform-admin');

export default defineConfig({
  root: platformRoot,
  publicDir: join(platformRoot, 'public'),
  base: './',
  build: {
    outDir: join(repoRoot, 'dist-platform'),
    emptyOutDir: true
  },
  server: {
    port: 5174,
    proxy: {
      '/api/platform': {
        target: 'http://127.0.0.1:8791',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/platform/, '')
      }
    }
  }
});
