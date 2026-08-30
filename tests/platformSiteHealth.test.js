import { describe, expect, it } from 'vitest';
import { evaluateSiteHealth, isPublicDemoSite } from '../platform-admin/src/health.js';

describe('platform site health', () => {
  it('treats public demo sites without Cloudflare Access JWT as healthy', () => {
    const health = { ok: true, body: { status: 'ok' } };
    const probe = {
      ok: true,
      body: {
        demoPublic: true,
        usesHubApiBinding: true,
        canForwardJwt: false,
        middlewareAccessValidated: false
      }
    };
    const result = evaluateSiteHealth(health, probe, { demoPublic: true });
    expect(result.status).toBe('healthy');
    expect(result.accessOk).toBe(true);
    expect(result.checks.find((check) => check.id === 'access-probe')?.label).toContain('Public demo gate');
  });

  it('still requires Access JWT for protected hubs', () => {
    const health = { ok: true, body: { status: 'ok' } };
    const probe = {
      ok: true,
      body: {
        usesHubApiBinding: true,
        canForwardJwt: false,
        middlewareAccessValidated: false
      }
    };
    const result = evaluateSiteHealth(health, probe, { accessEnabled: true });
    expect(result.accessOk).toBe(false);
    expect(result.status).toBe('degraded');
  });

  it('detects public demo from manifest metadata', () => {
    expect(isPublicDemoSite({ accessEnabled: false })).toBe(true);
    expect(isPublicDemoSite({ demoPublic: true })).toBe(true);
    expect(isPublicDemoSite({ accessEnabled: true })).toBe(false);
  });
});
