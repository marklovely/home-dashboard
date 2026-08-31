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
    expect(deprovisionWorkflow).toContain(BODY_MARKER);
  });

  it('lets auto-merge pick up the follow-up PR', () => {
    expect(automergeWorkflow).toContain("startsWith(github.event.pull_request.head.ref, 'platform/deprovision-')");
    expect(automergeWorkflow).toContain(BODY_MARKER);
  });
});
