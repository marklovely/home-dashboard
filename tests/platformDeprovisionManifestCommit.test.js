import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const deprovisionWorkflow = readFileSync(
  resolve(root, '.github/workflows/platform-site-deprovision-reusable.yml'),
  'utf8'
);
const automergeWorkflow = readFileSync(
  resolve(root, '.github/workflows/platform-site-pr-automerge.yml'),
  'utf8'
);

const BODY_MARKER = 'Automated deprovision follow-up from **Platform site deprovision**';

describe('deprovision manifest follow-up', () => {
  it('rebuilds and commits the manifest so torn-down sites lose their contract in git', () => {
    expect(deprovisionWorkflow).toContain('git add platform-admin/public/platform-manifest.json');
    expect(deprovisionWorkflow).toContain('BRANCH="platform/deprovision-${SITE_ID}-${GITHUB_RUN_ID}"');
    expect(deprovisionWorkflow).toContain('git config --unset-all http.https://github.com/.extraheader');
    expect(deprovisionWorkflow).toContain('persist-credentials: false');
    expect(deprovisionWorkflow).toContain(BODY_MARKER);
  });

  it('skips archive on retry when terraform already destroyed the hub', () => {
    const script = readFileSync(resolve(root, 'scripts/deprovision-hub-site.mjs'), 'utf8');
    const inStateDecl = script.indexOf('const inState = hubSiteModuleInState');
    const archiveCall = script.indexOf("run('node', [archiveScript, siteId])");
    expect(inStateDecl).toBeGreaterThan(-1);
    expect(archiveCall).toBeGreaterThan(-1);
    expect(inStateDecl).toBeLessThan(archiveCall);
    expect(script).toMatch(/Skipping archive — \$\{siteId\} is not in terraform state/);
  });

  it('empties hub R2 buckets and prunes Pages deployments before terraform destroy', () => {
    const script = readFileSync(resolve(root, 'scripts/deprovision-hub-site.mjs'), 'utf8');
    expect(script).toContain('empty-hub-site-r2-buckets.mjs');
    expect(script).toContain('prune-hub-pages-deployments.mjs');
    const tfvarsIdx = script.indexOf('generate-hub-tfvars.mjs');
    const emptyIdx = script.indexOf('empty-hub-site-r2-buckets.mjs');
    const pruneIdx = script.indexOf('prune-hub-pages-deployments.mjs');
    const destroyIdx = script.indexOf('runTerraformDestroy()');
    expect(tfvarsIdx).toBeGreaterThan(-1);
    expect(emptyIdx).toBeGreaterThan(tfvarsIdx);
    expect(pruneIdx).toBeGreaterThan(emptyIdx);
    expect(destroyIdx).toBeGreaterThan(pruneIdx);
  });

  it('redeploys platform admin after a customer hub teardown', () => {
    const workflow = readFileSync(
      resolve(root, '.github/workflows/platform-site-deprovision.yml'),
      'utf8'
    );
    expect(workflow).toMatch(/terraform_stack: customers\n\s+skip_platform_admin: false/);
    const script = readFileSync(resolve(root, 'scripts/deprovision-hub-site.mjs'), 'utf8');
    expect(script).not.toMatch(/skipPlatformAdmin \|\| terraformStack === 'customers'/);
  });

  it('lets auto-merge pick up the follow-up PR', () => {
    expect(automergeWorkflow).toContain("startsWith(github.event.pull_request.head.ref, 'platform/deprovision-')");
    expect(automergeWorkflow).toContain(BODY_MARKER);
  });
});
