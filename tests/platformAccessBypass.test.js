import { describe, expect, it } from 'vitest';
import {
  isPublicSignupEnabled,
  shouldBypassPlatformAccess
} from '../functions/lib/platformAccessBypass.js';

describe('platform Access bypass paths', () => {
  const platformEnv = {
    PLATFORM_OPERATOR_EMAILS: 'ops@example.com',
    PUBLIC_SIGNUP_ENABLED: 'false'
  };

  it('bypasses Stripe webhook when operators are configured', () => {
    expect(shouldBypassPlatformAccess('/api/stripe/webhook', platformEnv)).toBe(true);
    expect(shouldBypassPlatformAccess('/api/stripe/webhook', {})).toBe(false);
  });

  it('bypasses public signup routes for operators', () => {
    expect(shouldBypassPlatformAccess('/api/public/signup/slug/powell', platformEnv)).toBe(true);
    expect(shouldBypassPlatformAccess('/api/public/signup', platformEnv)).toBe(true);
  });

  it('bypasses public signup routes when PUBLIC_SIGNUP_ENABLED', () => {
    expect(
      shouldBypassPlatformAccess('/api/public/signup/slug/powell', {
        PUBLIC_SIGNUP_ENABLED: 'true'
      })
    ).toBe(true);
  });

  it('does not bypass unrelated platform routes', () => {
    expect(shouldBypassPlatformAccess('/api/platform/sites', platformEnv)).toBe(false);
    expect(shouldBypassPlatformAccess('/api/public', platformEnv)).toBe(false);
  });

  it('detects public signup enabled flag', () => {
    expect(isPublicSignupEnabled({ PUBLIC_SIGNUP_ENABLED: 'true' })).toBe(true);
    expect(isPublicSignupEnabled({ PUBLIC_SIGNUP_ENABLED: '1' })).toBe(true);
    expect(isPublicSignupEnabled({ PUBLIC_SIGNUP_ENABLED: 'false' })).toBe(false);
  });
});
