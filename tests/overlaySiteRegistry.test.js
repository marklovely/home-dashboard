import { describe, expect, it } from 'vitest';
import {
  overlayHubTfvarsExample,
  overlayPlatformManifest,
  overlaySiteRegistryFiles,
  overlaySitesYaml,
  overlayWorkerPackageJson,
  overlayWranglerToml
} from '../scripts/lib/overlay-site-registry.mjs';
import { siteIdFromPlatformPrTitle } from '../scripts/lib/platform-pr-site-id.mjs';
import { parseSitesYaml } from '../scripts/lib/load-sites-yaml.mjs';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

describe('overlaySitesYaml', () => {
  const base = `sites:
  alpha:
    hostname: alpha.lovely-hub.com
    hub_environment: alpha
    vanilla: false
    terraform: true
    zone_name: lovely-hub.com
  beta:
    hostname: beta.lovely-hub.com
    hub_environment: beta
    vanilla: false
    terraform: true
    zone_name: lovely-hub.com
`;

  it('keeps another site that landed on main while this job ran', () => {
    const source = `sites:
  alpha:
    hostname: alpha.lovely-hub.com
    hub_environment: alpha
    vanilla: false
    terraform: true
    zone_name: lovely-hub.com
    attach_hub_api_binding: true
`;
    const next = overlaySitesYaml('alpha', base, source);
    const parsed = parseSitesYaml(next);
    expect(parsed.alpha.attach_hub_api_binding).toBe(true);
    expect(parsed.beta.hostname).toBe('beta.lovely-hub.com');
  });

  it('deletes the site from latest main when the snapshot removed it', () => {
    const source = `sites:
  beta:
    hostname: beta.lovely-hub.com
    hub_environment: beta
    vanilla: false
    terraform: true
    zone_name: lovely-hub.com
`;
    const next = overlaySitesYaml('alpha', base, source);
    const parsed = parseSitesYaml(next);
    expect(parsed.alpha).toBeUndefined();
    expect(parsed.beta.hostname).toBe('beta.lovely-hub.com');
  });
});

describe('overlayWranglerToml', () => {
  const base = `# ---------------------------------------------------------------------------
# Alpha environment — Terraform-managed
# ---------------------------------------------------------------------------

[env.alpha]
name = "lovely-home-hub-api-alpha"

# ---------------------------------------------------------------------------
# Beta environment — Terraform-managed
# ---------------------------------------------------------------------------

[env.beta]
name = "lovely-home-hub-api-beta"
`;

  it('patches one env without dropping another site added on main', () => {
    const source = `# ---------------------------------------------------------------------------
# Alpha environment — Terraform-managed
# ---------------------------------------------------------------------------

[env.alpha]
name = "lovely-home-hub-api-alpha"
database_id = "abc-123"
`;
    const next = overlayWranglerToml('alpha', base, source);
    expect(next).toContain('database_id = "abc-123"');
    expect(next).toContain('[env.beta]');
  });
});

describe('overlayWorkerPackageJson', () => {
  it('adds one site scripts and keeps scripts for a site that landed on main', () => {
    const base = JSON.stringify({
      scripts: {
        'deploy:alpha': 'old',
        'deploy:beta': 'keep-beta'
      }
    });
    const source = JSON.stringify({
      scripts: {
        'deploy:alpha': 'new-alpha',
        'd1:migrate:alpha': 'migrate-alpha'
      }
    });
    const next = JSON.parse(overlayWorkerPackageJson('alpha', base, source));
    expect(next.scripts['deploy:alpha']).toBe('new-alpha');
    expect(next.scripts['d1:migrate:alpha']).toBe('migrate-alpha');
    expect(next.scripts['deploy:beta']).toBe('keep-beta');
  });
});

describe('overlayHubTfvarsExample', () => {
  const base = `sites = {
  alpha = {
    hostname = "alpha.lovely-hub.com"
  }
  beta = {
    hostname = "beta.lovely-hub.com"
  }
}
`;

  it('updates one block and keeps the other', () => {
    const source = `sites = {
  alpha = {
    hostname = "alpha.lovely-hub.com"
    attach_hub_api_binding = true
  }
}
`;
    const next = overlayHubTfvarsExample('alpha', base, source);
    expect(next).toContain('attach_hub_api_binding = true');
    expect(next).toContain('beta = {');
  });
});

describe('overlayPlatformManifest', () => {
  it('replaces one contract and keeps another site', () => {
    const base = JSON.stringify({
      sites: {
        alpha: { siteId: 'alpha', contract: null },
        beta: { siteId: 'beta', contract: { d1_database_id: 'b' } }
      }
    });
    const source = JSON.stringify({
      sites: {
        alpha: { siteId: 'alpha', contract: { d1_database_id: 'a' } }
      }
    });
    const next = JSON.parse(overlayPlatformManifest('alpha', base, source));
    expect(next.sites.alpha.contract.d1_database_id).toBe('a');
    expect(next.sites.beta.contract.d1_database_id).toBe('b');
  });
});

describe('overlaySiteRegistryFiles', () => {
  it('overlays every registry file for one site', () => {
    const yaml = `sites:
  alpha:
    hostname: alpha.lovely-hub.com
    hub_environment: alpha
    vanilla: false
    terraform: true
`;
    const files = overlaySiteRegistryFiles(
      'alpha',
      {
        'platform/sites.yaml': yaml,
        'worker/wrangler.toml': '[env.alpha]\nname = "a"\n',
        'worker/package.json': '{"scripts":{}}',
        'terraform/environments/hub.tfvars.example': 'sites = {\n}\n',
        'platform-admin/public/platform-manifest.json': '{"sites":{}}'
      },
      {
        'platform/sites.yaml': yaml.replace('terraform: true', 'terraform: true\n    attach_hub_api_binding: true'),
        'worker/wrangler.toml': '[env.alpha]\nname = "a"\n',
        'worker/package.json': '{"scripts":{"deploy:alpha":"x"}}',
        'terraform/environments/hub.tfvars.example': 'sites = {\n  alpha = {\n    hostname = "alpha.lovely-hub.com"\n  }\n}\n',
        'platform-admin/public/platform-manifest.json': '{"sites":{"alpha":{"siteId":"alpha"}}}'
      }
    );
    expect(parseSitesYaml(files['platform/sites.yaml']).alpha.attach_hub_api_binding).toBe(true);
    expect(JSON.parse(files['worker/package.json']).scripts['deploy:alpha']).toBe('x');
    expect(JSON.parse(files['platform-admin/public/platform-manifest.json']).sites.alpha.siteId).toBe(
      'alpha'
    );
  });
});

describe('siteIdFromPlatformPrTitle', () => {
  it('parses automated registry PR titles', () => {
    expect(siteIdFromPlatformPrTitle('platform: create site willow')).toBe('willow');
    expect(siteIdFromPlatformPrTitle('platform: billing deprovision e2e-abc')).toBe('e2e-abc');
    expect(
      siteIdFromPlatformPrTitle(
        'platform: mark willow provisioned (attach HUB_API, sync D1 ids, manifest contract)'
      )
    ).toBe('willow');
    expect(siteIdFromPlatformPrTitle('platform: drop willow contract from platform manifest')).toBe(
      'willow'
    );
    expect(siteIdFromPlatformPrTitle('Fix the bins app')).toBeNull();
  });
});

describe('registry jobs replay onto origin/main before opening a PR', () => {
  it('replays the site snapshot after tests in billing deprovision and site manage', () => {
    const billing = readFileSync(
      join(root, '.github/workflows/platform-site-billing-deprovision.yml'),
      'utf8'
    );
    const manage = readFileSync(join(root, '.github/workflows/platform-site-manage.yml'), 'utf8');
    const provision = readFileSync(
      join(root, '.github/workflows/platform-site-provision-reusable.yml'),
      'utf8'
    );
    const deprovision = readFileSync(
      join(root, '.github/workflows/platform-site-deprovision-reusable.yml'),
      'utf8'
    );
    expect(billing).toContain('node scripts/replay-site-registry-onto-main.mjs "$SITE_ID"');
    expect(manage).toContain('node scripts/replay-site-registry-onto-main.mjs');
    expect(provision).toContain('node scripts/replay-site-registry-onto-main.mjs "$SITE_ID"');
    expect(deprovision).toContain('node scripts/replay-site-registry-onto-main.mjs "$SITE_ID"');
    expect(manage).toContain('group: platform-registry-git');
  });

  it('reconciles dirty platform PRs instead of merging with -X ours', () => {
    const yml = readFileSync(join(root, '.github/workflows/platform-site-pr-automerge.yml'), 'utf8');
    expect(yml).toContain('node scripts/replay-dirty-platform-pr.mjs');
    expect(yml).not.toContain('git merge origin/main -X ours');
    expect(yml).toContain('cron:');
  });
});
