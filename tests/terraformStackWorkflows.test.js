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
  });

  it('locks each stack separately so customer signup cannot block platform applies', () => {
    expect(readWorkflow('.github/workflows/platform-site-provision-reusable.yml')).toContain(
      'platform-terraform-state-${{ inputs.terraform_stack }}'
    );
    expect(readWorkflow('.github/workflows/platform-site-deprovision-reusable.yml')).toContain(
      'platform-terraform-state-${{ inputs.terraform_stack }}'
    );
    expect(readWorkflow('.github/workflows/platform-site-provision.yml')).toContain(
      'terraform_stack: customers'
    );
    expect(readWorkflow('.github/workflows/platform-site-provision.yml')).toContain(
      'terraform_stack: platform'
    );
  });

  it('keeps hub.tfstate as the migration source only', () => {
    const migrate = readWorkflow('.github/workflows/platform-terraform-migrate-stacks.yml');
    expect(migrate).toContain('migrate-terraform-state-stacks.sh');
    expect(migrate).toContain('split-stacks');
  });
});
