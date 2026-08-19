import { describe, expect, it } from 'vitest';
import { patchEnvD1FromTerraform } from '../scripts/lib/wrangler-env-block.mjs';

const sample = `
# ---------------------------------------------------------------------------
# Demo environment — Terraform-managed
# ---------------------------------------------------------------------------

[env.demo]
name = "lovely-home-hub-api-demo"

[[env.demo.d1_databases]]
binding = "APPLIANCE_MANUALS_DB"
database_name = "lovely-home-appliance-manuals-demo"
database_id = "8dde150d-daa1-443c-afa3-3a01cb908333"

[[env.demo.d1_databases]]
binding = "HOUSE_GUIDE_DB"
database_name = "lovely-home-appliance-manuals-demo"
database_id = "8dde150d-daa1-443c-afa3-3a01cb908333"

# ---------------------------------------------------------------------------
# Sandbox environment — Terraform-managed
# ---------------------------------------------------------------------------

[env.sandbox]
name = "lovely-home-hub-api-sandbox"
`;

describe('patchEnvD1FromTerraform', () => {
  it('replaces stale database_id values within the site env block only', () => {
    const { toml, changed } = patchEnvD1FromTerraform(
      sample,
      'demo',
      '99fd8a57-5e5a-4e0d-8c01-30533ea47f13',
      'lovely-home-appliance-manuals-demo'
    );

    expect(changed).toBe(true);
    expect(toml.match(/99fd8a57-5e5a-4e0d-8c01-30533ea47f13/g)).toHaveLength(2);
    expect(toml).not.toContain('8dde150d-daa1-443c-afa3-3a01cb908333');
    expect(toml).toContain('[env.sandbox]');
  });

  it('replaces provision placeholders', () => {
    const withPlaceholder = sample.replaceAll(
      '8dde150d-daa1-443c-afa3-3a01cb908333',
      'REPLACE_AFTER_PROVISION_DEMO'
    );
    const { toml } = patchEnvD1FromTerraform(
      withPlaceholder,
      'demo',
      '99fd8a57-5e5a-4e0d-8c01-30533ea47f13'
    );
    expect(toml).not.toContain('REPLACE_AFTER_PROVISION_DEMO');
    expect(toml).toContain('database_id = "99fd8a57-5e5a-4e0d-8c01-30533ea47f13"');
  });
});
