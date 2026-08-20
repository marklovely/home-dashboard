import { describe, expect, it } from 'vitest';
import { isPagesPreviewEnabled } from '../scripts/lib/pages-preview.mjs';

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
});
