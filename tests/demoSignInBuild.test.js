import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

describe('demo sign-in build output', () => {
  it('builds sign-in.html and does not ship _redirects login rules', () => {
    const root = join(import.meta.dirname, '..');
    execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'pipe' });
    const dist = join(root, 'dist');
    expect(existsSync(join(dist, 'sign-in.html'))).toBe(true);
    expect(existsSync(join(dist, 'demo-login.html'))).toBe(false);
    const files = readdirSync(dist);
    expect(files.includes('_redirects')).toBe(false);
  });
});
