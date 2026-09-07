import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

describe('not found pages', () => {
  it('ships a marketing 404 for lovely-home.co.uk', () => {
    const html = readFileSync(join(root, 'website/404.html'), 'utf8');
    expect(html).toMatch(/Page not found/i);
    expect(html).toContain('noindex');
    expect(html).toContain('href="/site.css"');
    expect(html).toContain('src="/site.js"');
    expect(html).toContain('href="/favicon.png"');
    expect(html).toContain('src="/lovely-home-mark.svg"');
    expect(html).toContain('href="/"');
    expect(html).toContain('{your-name}.lovely-hub.com');
  });

  it('ships zone root and 404 pages for lovely-hub.com', () => {
    const index = readFileSync(join(root, 'zone/index.html'), 'utf8');
    const notFound = readFileSync(join(root, 'zone/404.html'), 'utf8');
    expect(index).toMatch(/Your hub lives on its own address/i);
    expect(index).toContain('href="/site.css"');
    expect(index).toContain('href="/favicon.png"');
    expect(notFound).toMatch(/Page not found/i);
    expect(notFound).toContain('noindex');
    expect(notFound).toContain('smith.lovely-hub.com');
  });

  it('includes hub 404.html in the Vite build output', () => {
    const vite = readFileSync(join(root, 'vite.config.js'), 'utf8');
    expect(vite).toContain("src/404.html");

    execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'pipe' });
    const hub404 = readFileSync(join(root, 'dist/404.html'), 'utf8');
    expect(hub404).toMatch(/Page not found/i);
    expect(hub404).toContain('noindex');
    expect(hub404).toContain('Back to hub home');
    expect(hub404).toContain('href="/icons/icon-192.png"');
  });

  it('bypasses marketing Access for the 404 page when the site is gated', () => {
    const tf = readFileSync(join(root, 'terraform/modules/marketing_site/access.tf'), 'utf8');
    expect(tf).toContain('not_found');
    expect(tf).toContain('/404.html');
    expect(tf).toMatch(/decision\s*=\s*"bypass"/);
  });

  it('documents zone deploy script for lovely-hub.com apex', () => {
    const script = readFileSync(join(root, 'scripts/deploy-lovely-hub-zone-pages.sh'), 'utf8');
    expect(script).toContain('lovely-hub-zone');
    expect(script).toContain('./zone');
    expect(script).toContain('favicon.png');
  });
});
