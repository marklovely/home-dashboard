import { describe, expect, it } from 'vitest';
import { isPublicDemoHub } from '../functions/lib/publicDemoHub.js';

describe('isPublicDemoHub', () => {
  it('skips Cloudflare Access for public demo hubs', () => {
    expect(isPublicDemoHub({ DEMO_PUBLIC: 'true' })).toBe(true);
    expect(isPublicDemoHub({ VITE_HUB_ENVIRONMENT: 'demo' })).toBe(true);
    expect(isPublicDemoHub({ VITE_HUB_ENVIRONMENT: 'demo', DEMO_PUBLIC: 'false' })).toBe(true);
  });

  it('does not treat other hubs as public demo', () => {
    expect(isPublicDemoHub({ VITE_HUB_ENVIRONMENT: 'smith' })).toBe(false);
    expect(isPublicDemoHub({})).toBe(false);
  });
});
