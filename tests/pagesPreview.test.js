import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPagesGitProductionEnabled, isPagesPreviewEnabled } from '../scripts/lib/pages-preview.mjs';

describe('pages-preview', () => {
  it('detects when preview builds are enabled', () => {
    expect(
      isPagesPreviewEnabled({
        source: { config: { preview_deployment_setting: 'all' } }
      })
    ).toBe(true);
    expect(
      isPagesPreviewEnabled({
        source: { config: { preview_deployment_setting: 'none' } }
      })
    ).toBe(false);
  });

  it('treats missing production_deployments_enabled as on (Cloudflare default)', () => {
    expect(isPagesGitProductionEnabled({ source: { config: {} } })).toBe(true);
    expect(
      isPagesGitProductionEnabled({
        source: { config: { production_deployments_enabled: false } }
      })
    ).toBe(false);
  });
});

describe('hub Pages git production deploys', () => {
  it('does not git-auto-deploy hub Pages on every main merge', () => {
    const tf = readFileSync(join(process.cwd(), 'terraform/modules/hub_environment/pages.tf'), 'utf8');
    expect(tf).toMatch(/production_deployments_enabled\s*=\s*false/);
    const provision = readFileSync(join(process.cwd(), 'scripts/provision-hub-site.mjs'), 'utf8');
    expect(provision).toContain('disable-hub-pages-git-production.mjs');
    const ensure = readFileSync(join(process.cwd(), '.github/workflows/ensure-hub-api-bindings.yml'), 'utf8');
    expect(ensure).not.toContain('sleep 180');
    expect(ensure).toContain('disable-hub-pages-git-production.mjs');
    const deploy = readFileSync(join(process.cwd(), '.github/workflows/deploy-hub-pages.yml'), 'utf8');
    expect(deploy).toContain("paths:");
    expect(deploy).toContain('deploy-cloudflare-pages-site.sh');
  });
});
