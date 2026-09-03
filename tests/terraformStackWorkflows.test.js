import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');

/**
 * @param {string} relativePath
 */
function readWorkflow(relativePath) {
  return readFileSync(resolve(root, relativePath), 'utf8');
}

describe('terraform stack workflows', () => {
  const applyWorkflows = [
    '.github/workflows/platform-site-provision-reusable.yml',
    '.github/workflows/platform-site-deprovision-reusable.yml',
    '.github/workflows/platform-site-billing-deprovision.yml',
    '.github/workflows/platform-sync-archive-github-secrets.yml'
  ];

  it('does not apply against the legacy combined hub.tfstate', () => {
    for (const path of applyWorkflows) {
      expect(readWorkflow(path), path).not.toContain('home-dashboard/hub.tfstate');
      expect(readWorkflow(path), path).toContain('terraform-init-r2.sh');
    }
    expect(readWorkflow('.github/workflows/platform-site-provision.yml')).toContain(
      'terraform_stack: customers'
    );
    expect(readWorkflow('.github/workflows/platform-site-provision.yml')).toContain(
      'terraform_stack: platform'
    );
  });

  it('locks customer hubs per site so two households can apply at once', () => {
    expect(readWorkflow('.github/workflows/platform-site-provision-reusable.yml')).toContain(
      "format('platform-terraform-state-customers-{0}', inputs.site_id)"
    );
    expect(readWorkflow('.github/workflows/platform-site-deprovision-reusable.yml')).toContain(
      "format('platform-terraform-state-customers-{0}', inputs.site_id)"
    );
    expect(readWorkflow('.github/workflows/platform-site-provision-reusable.yml')).toContain(
      'terraform-init-r2.sh "${{ inputs.terraform_stack }}" "${{ inputs.site_id }}"'
    );
    expect(readWorkflow('.github/workflows/platform-site-provision.yml')).toContain('max-parallel: 4');
    expect(readWorkflow('.github/workflows/platform-site-provision.yml')).toContain(
      "format('push-{0}', github.sha)"
    );
  });

  it('keeps hub.tfstate as the migration source only', () => {
    const migrate = readWorkflow('.github/workflows/platform-terraform-migrate-stacks.yml');
    expect(migrate).toContain('migrate-terraform-state-stacks.sh');
    expect(migrate).toContain('split-stacks');
  });

  it('has a one-shot split for per-site customer state', () => {
    const migrate = readWorkflow('.github/workflows/platform-terraform-migrate-customer-sites.yml');
    expect(migrate).toContain('migrate-terraform-state-customer-sites.sh');
    expect(migrate).toContain('split-sites');
  });
});
