import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BRAND_LOGO_OBJECT_KEY } from '../worker/src/lib/brandMediaStorage.js';
import {
  BRAND_MEDIA_BUCKET_NAME,
  listBrandMediaObjects,
  wranglerBrandMediaPutArgs
} from '../scripts/lib/brand-media.mjs';

describe('brand media R2 catalog', () => {
  it('uploads the hub wordmark under the Worker object key', () => {
    const objects = listBrandMediaObjects();
    expect(BRAND_MEDIA_BUCKET_NAME).toBe('lovely-home-media');
    expect(objects.some((object) => object.key === BRAND_LOGO_OBJECT_KEY)).toBe(true);
    expect(objects.every((object) => existsSync(object.file))).toBe(true);
  });

  it('puts objects with a content type and without --account-id', () => {
    const args = wranglerBrandMediaPutArgs(
      'lovely-home-media/brand/lovely-home-mark.svg',
      '/tmp/mark.svg',
      'image/svg+xml'
    );
    expect(args).toEqual([
      'r2',
      'object',
      'put',
      'lovely-home-media/brand/lovely-home-mark.svg',
      '--file',
      '/tmp/mark.svg',
      '--content-type',
      'image/svg+xml',
      '--remote'
    ]);
    expect(args.join(' ')).not.toMatch(/account-id|accountId/);
  });
});
