import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { websiteQrAfterFailedRebuild, websiteQrRebuildPlan } from '../scripts/lib/website-qr-rebuild.mjs';

const repo = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {{ qrcode?: boolean, vendor?: boolean }} options
 */
function fakeRoot(options = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'qr-rebuild-'));
  if (options.qrcode !== false) {
    mkdirSync(join(dir, 'node_modules/qrcode'), { recursive: true });
  }
  if (options.vendor !== false) {
    mkdirSync(join(dir, 'website/vendor'), { recursive: true });
    writeFileSync(join(dir, 'website/vendor/lovely-qr.js'), '// stub\n');
  }
  return dir;
}

describe('website QR rebuild plan', () => {
  it('rebuilds when qrcode is installed and Rollup loads', async () => {
    const plan = await websiteQrRebuildPlan({
      rootDir: fakeRoot(),
      importRollup: async () => ({})
    });
    expect(plan.action).toBe('rebuild');
  });

  it('uses the committed bundle when Rollup cannot load', async () => {
    const plan = await websiteQrRebuildPlan({
      rootDir: fakeRoot(),
      importRollup: async () => {
        throw new Error('Cannot find module @rollup/rollup-darwin-arm64');
      }
    });
    expect(plan.action).toBe('use-committed');
    expect(plan.reason).toBe('rollup-unusable');
  });

  it('uses the committed bundle when node_modules is missing', async () => {
    const plan = await websiteQrRebuildPlan({
      rootDir: fakeRoot({ qrcode: false })
    });
    expect(plan.action).toBe('use-committed');
    expect(plan.reason).toBe('no-qrcode-package');
  });

  it('fails when there is nothing to upload and nothing to rebuild with', async () => {
    const plan = await websiteQrRebuildPlan({
      rootDir: fakeRoot({ qrcode: false, vendor: false })
    });
    expect(plan.action).toBe('fail');
  });

  it('keeps the committed bundle if a rebuild is attempted and fails', () => {
    expect(websiteQrAfterFailedRebuild(true)).toEqual({
      action: 'use-committed',
      reason: 'rebuild-failed'
    });
    expect(websiteQrAfterFailedRebuild(false)).toEqual({ action: 'fail' });
  });
});

describe('deploy-lovely-home-website.sh', () => {
  it('delegates QR rebuild to the helper that can skip a broken Rollup install', () => {
    const script = readFileSync(join(repo, 'scripts/deploy-lovely-home-website.sh'), 'utf8');
    expect(script).toContain('ensure-website-qr.mjs');
    expect(script).toContain('write-website-version.mjs');
    expect(script).not.toMatch(/npm run build:website-qr/);
  });
});
