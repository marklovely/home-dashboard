import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('PWA service worker build', () => {
  it('stamps the app version into the dist service worker cache name', () => {
    const root = join(import.meta.dirname, '..');
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    execFileSync('node', ['scripts/copy-pwa-assets.js'], { cwd: root, stdio: 'pipe' });
    const serviceWorker = readFileSync(join(root, 'dist/service-worker.js'), 'utf8');
    expect(serviceWorker).toContain(`home-dashboard-v${pkg.version}`);
    expect(serviceWorker).not.toContain('__APP_VERSION__');
  });
});
