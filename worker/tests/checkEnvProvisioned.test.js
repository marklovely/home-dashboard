import { describe, expect, it } from 'vitest';
import {
  envBlockHasPlaceholder,
  extractEnvBlock
} from '../scripts/check-env-provisioned.mjs';

const sample = `
[env.demo]
name = "lovely-home-hub-api-demo"

[[env.demo.d1_databases]]
database_id = "REPLACE_AFTER_TERRAFORM_APPLY"

# ---------------------------------------------------------------------------
# Other environment
# ---------------------------------------------------------------------------

[env.sandbox]
name = "lovely-home-hub-api-sandbox"
`;

describe('check-env-provisioned', () => {
  it('extracts a single env block without bleeding into the next', () => {
    const block = extractEnvBlock(sample, 'demo');
    expect(block).toContain('[env.demo]');
    expect(block).toContain('REPLACE_AFTER_TERRAFORM_APPLY');
    expect(block).not.toContain('[env.sandbox]');
  });

  it('detects terraform and provision placeholders in the env block', () => {
    expect(envBlockHasPlaceholder('database_id = "REPLACE_AFTER_TERRAFORM_APPLY"')).toBe(true);
    expect(envBlockHasPlaceholder('database_id = "REPLACE_AFTER_PROVISION_DEMO"')).toBe(true);
    expect(envBlockHasPlaceholder('database_id = "8e690b7c-cc90-4746-b578-ffd24fef08a5"')).toBe(false);
  });
});
