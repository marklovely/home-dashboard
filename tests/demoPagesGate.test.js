import { describe, expect, it } from 'vitest';
import { DEMO_PUBLIC_PATHS, isDemoPublicPath } from '../functions/lib/demoPagesGate.js';

describe('demoPagesGate', () => {
  it('uses /sign-in as the public demo login path', () => {
    expect(DEMO_PUBLIC_PATHS).toContain('/sign-in');
  });

  it('allows sign-in and demo API routes without auth', () => {
    expect(isDemoPublicPath('/sign-in')).toBe(true);
    expect(isDemoPublicPath('/sign-in/')).toBe(true);
    expect(isDemoPublicPath('/sign-in.html')).toBe(true);
    expect(isDemoPublicPath('/api/demo/session')).toBe(true);
    expect(isDemoPublicPath('/api/demo/login')).toBe(true);
  });

  it('does not treat the old /demo-login path as public', () => {
    expect(isDemoPublicPath('/demo-login')).toBe(false);
    expect(isDemoPublicPath('/demo-login.html')).toBe(false);
  });

  it('does not treat the hub shell as public', () => {
    expect(isDemoPublicPath('/')).toBe(false);
    expect(isDemoPublicPath('/index.html')).toBe(false);
  });
});
