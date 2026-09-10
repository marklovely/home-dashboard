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
  it('does not auto-deploy the hub fleet on every main merge', () => {
    const tf = readFileSync(join(process.cwd(), 'terraform/modules/hub_environment/pages.tf'), 'utf8');
    expect(tf).toMatch(/production_deployments_enabled\s*=\s*false/);
    const provision = readFileSync(join(process.cwd(), 'scripts/provision-hub-site.mjs'), 'utf8');
    expect(provision).toContain('disable-hub-pages-git-production.mjs');
    const ensure = readFileSync(join(process.cwd(), '.github/workflows/ensure-hub-api-bindings.yml'), 'utf8');
    expect(ensure).not.toContain('sleep 180');
    expect(ensure).toContain('disable-hub-pages-git-production.mjs');
    const legacyDeploy = readFileSync(join(process.cwd(), '.github/workflows/deploy-hub-pages.yml'), 'utf8');
    expect(legacyDeploy).not.toContain("paths:");
    expect(legacyDeploy).not.toContain('push:');
    const cd = readFileSync(join(process.cwd(), '.github/workflows/cd-hub-pages.yml'), 'utf8');
    expect(cd).toContain('workflow_dispatch');
    expect(cd).toContain('build-hub-pages-artifact.sh');
    expect(cd).toContain('deploy-hub-pages-from-artifact.sh');
    const ci = readFileSync(join(process.cwd(), '.github/workflows/ci.yml'), 'utf8');
    expect(ci).not.toContain('deploy-hub-pages-from-artifact');
  });
});
