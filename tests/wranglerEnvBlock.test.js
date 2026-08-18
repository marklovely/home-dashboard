import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { removeWranglerEnvBlock } from '../scripts/lib/wrangler-env-block.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const wranglerPath = join(root, 'worker/wrangler.toml');

describe('wrangler env block removal', () => {
  it('removes the full demo env block including [env.demo] bindings', () => {
    const sample = `# ---------------------------------------------------------------------------
# Sandbox environment — Terraform-managed
# ---------------------------------------------------------------------------

[env.sandbox]
name = "lovely-home-hub-api-sandbox"

# ---------------------------------------------------------------------------
# Demo environment — Terraform-managed
# ---------------------------------------------------------------------------

[env.demo]
name = "lovely-home-hub-api-demo"

[[env.demo.r2_buckets]]
binding = "GUIDE_MEDIA"
bucket_name = "lovely-home-guide-media-demo"
`;

    const { text, changed } = removeWranglerEnvBlock(sample, 'demo');
    expect(changed).toBe(true);
    expect(text).not.toMatch(/\[env\.demo\]/);
    expect(text).not.toMatch(/Demo environment/);
    expect(text).toMatch(/\[env\.sandbox\]/);
  });

  it('removes orphaned partial header lines left by older delete bug', () => {
    const sample = `[env.sandbox]
name = "lovely-home-hub-api-sandbox"

# Provision: terraform apply + node scripts/sync-wrangler-from-terraform.mjs demo
# ---------------------------------------------------------------------------

[env.demo]
name = "lovely-home-hub-api-demo"
`;

    const { text } = removeWranglerEnvBlock(sample, 'demo');
    expect(text).not.toMatch(/\[env\.demo\]/);
    expect(text).not.toMatch(/sync-wrangler-from-terraform\.mjs demo/);
    expect(text).toMatch(/\[env\.sandbox\]/);
  });

  it('main wrangler.toml has no demo env after cleanup', () => {
    const text = readFileSync(wranglerPath, 'utf8');
    expect(text).not.toMatch(/\[env\.demo\]/);
  });
});
