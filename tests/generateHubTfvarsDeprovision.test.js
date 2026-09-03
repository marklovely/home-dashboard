import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('generate-hub-tfvars deprovision fallbacks', () => {
  it('manifest contract includes fields needed for deprovision tfvars', () => {
    const manifest = JSON.parse(
      readFileSync(join(process.cwd(), 'platform-admin/public/platform-manifest.json'), 'utf8')
    );
    const contract = manifest?.sites?.wagtail?.contract ?? {};
    expect(contract.hostname).toBe('wagtail.lovely-hub.com');
    expect(contract.hub_environment).toBe('wagtail');
    expect(contract.vanilla).toBe(false);
    expect(String(contract.worker_api_origin ?? '')).toContain('lovely-home-hub-api-wagtail');
    expect(contract.r2_guides_bucket).toBe('lovely-home-appliance-guides-wagtail');
    expect(contract.r2_media_bucket).toBe('lovely-home-guide-media-wagtail');
  });
});
