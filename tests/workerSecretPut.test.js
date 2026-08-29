import { describe, expect, it } from 'vitest';
import {
  needsVersionsSecretPut,
  wranglerEnvFromDeploySiteId,
  wranglerSecretPutArgs
} from '../scripts/lib/worker-secret-put.mjs';

describe('worker-secret-put', () => {
  it('maps prod deploy script to default Worker env', () => {
    expect(wranglerEnvFromDeploySiteId('prod')).toBeNull();
    expect(wranglerEnvFromDeploySiteId('smith')).toBe('smith');
  });

  it('builds secret put args with explicit env', () => {
    expect(wranglerSecretPutArgs('smith', 'PLATFORM_SITE_ARCHIVE_SECRET', 'secret')).toEqual([
      'wrangler',
      'secret',
      'put',
      'PLATFORM_SITE_ARCHIVE_SECRET',
      '--env',
      'smith'
    ]);
  });

  it('builds default Worker args with empty env flag', () => {
    expect(wranglerSecretPutArgs(null, 'PLATFORM_SITE_ARCHIVE_SECRET', 'secret')).toEqual([
      'wrangler',
      'secret',
      'put',
      'PLATFORM_SITE_ARCHIVE_SECRET',
      '--env',
      ''
    ]);
  });

  it('builds versions secret put fallback args', () => {
    expect(wranglerSecretPutArgs('sandbox', 'PLATFORM_SITE_ARCHIVE_SECRET', 'versions')).toEqual([
      'wrangler',
      'versions',
      'secret',
      'put',
      'PLATFORM_SITE_ARCHIVE_SECRET',
      '--env',
      'sandbox'
    ]);
  });

  it('detects undeployed Worker errors for fallback', () => {
    expect(
      needsVersionsSecretPut(
        "Secret edit failed. You attempted to modify a secret, but the latest version of your Worker isn't currently deployed."
      )
    ).toBe(true);
    expect(needsVersionsSecretPut('network timeout')).toBe(false);
  });
});
