import { describe, expect, it } from 'vitest';
import {
  evaluateSiteHealthForMonitoring,
  isPublicDemoSite,
  matchHubDatabasesToAccount,
  summarizeBillingRows
} from '../functions/api/platform/platformMonitoring.js';
import { D1_DATABASE_COUNT_LIMIT } from '../functions/api/platform/platformCloudflareUsage.js';
import { renderMonitoringView } from '../platform-admin/src/monitoring.js';

describe('platformMonitoring billing summary', () => {
  it('counts billing rows by status and open subscriptions', () => {
    const summary = summarizeBillingRows([
      { site_id: 'a', status: 'active', owner_email: 'a@example.com' },
      { site_id: 'b', status: 'trialing', owner_email: 'b@example.com' },
      { site_id: 'c', status: 'canceled', owner_email: 'c@example.com' }
    ]);

    expect(summary.total).toBe(3);
    expect(summary.openCount).toBe(2);
    expect(summary.byStatus).toEqual({ active: 1, trialing: 1, canceled: 1 });
  });
});

describe('platformMonitoring D1 inventory match', () => {
  it('matches hub databases against account inventory', () => {
    const match = matchHubDatabasesToAccount(
      [
        { siteId: 'demo', databaseId: 'db-1', databaseName: 'demo-db' },
        { siteId: 'lovely', databaseId: 'db-2', databaseName: 'lovely-db' }
      ],
      [
        { id: 'db-1', name: 'demo-db' },
        { id: 'db-3', name: 'legacy-db' }
      ]
    );

    expect(match).toEqual({
      hubCount: 2,
      accountCount: 2,
      matchedOnAccount: 1,
      orphanOnAccount: 1,
      limit: D1_DATABASE_COUNT_LIMIT
    });
  });
});

describe('platformMonitoring health evaluation', () => {
  it('detects public demo sites', () => {
    expect(isPublicDemoSite({ demoPublic: true })).toBe(true);
    expect(isPublicDemoSite({ accessEnabled: false })).toBe(true);
    expect(isPublicDemoSite({ accessEnabled: true })).toBe(false);
  });

  it('marks a fully healthy hub as healthy', () => {
    const result = evaluateSiteHealthForMonitoring(
      { ok: true, status: 200, body: { status: 'ok' } },
      { ok: true, status: 200, body: { usesHubApiBinding: true, canForwardJwt: true } },
      { accessEnabled: true }
    );
    expect(result.status).toBe('healthy');
    expect(result.score).toBe(3);
  });

  it('returns unknown when service auth is missing', () => {
    const result = evaluateSiteHealthForMonitoring(
      { needsServiceAuth: true },
      { ok: true, status: 200, body: {} },
      {}
    );
    expect(result.status).toBe('unknown');
    expect(result.checks).toEqual([]);
  });
});

describe('platformMonitoring UI', () => {
  it('renders monitoring sections from summary payload', () => {
    const html = renderMonitoringView({
      generatedAt: '2026-09-08T12:00:00.000Z',
      manifestGeneratedAt: '2026-09-07T12:00:00.000Z',
      overview: {
        siteCount: 2,
        terraformCount: 2,
        healthCounts: { healthy: 1, degraded: 1, bad: 0, unknown: 0 }
      },
      integrations: {
        healthServiceAuthConfigured: true,
        cloudflareUsageConfigured: false,
        cloudflarePagesConfigured: false,
        githubAutomationConfigured: false,
        stripeBillingConfigured: true,
        platformBillingDbConfigured: true
      },
      cloudflare: {
        storage: { ok: false, message: 'not configured' },
        d1Match: { hubCount: 2, accountCount: null, limit: 10 }
      },
      billing: {
        openSubscriptions: 1,
        stripe: { mode: 'test', keyPrefix: 'sk_test' },
        summary: { total: 1, byStatus: { active: 1 }, openCount: 1, rows: [] }
      },
      marketing: {
        origin: 'https://lovely-home.co.uk',
        home: { ok: true, status: 200, elapsedMs: 120 },
        pricingApi: { ok: true, status: 200, configured: true },
        signupStatus: { ok: true, status: 200, body: { enabled: true } }
      },
      automation: { ok: false, error: 'GITHUB_NOT_CONFIGURED' },
      hubs: [
        {
          siteId: 'demo',
          hostname: 'demo.lovely-home.co.uk',
          protected: true,
          terraform: true,
          evaluation: {
            status: 'healthy',
            publicDemo: true,
            checks: [{ id: 'worker', ok: true, label: 'Worker /api/health OK' }]
          }
        }
      ],
      links: {
        cloudflare: 'https://dash.cloudflare.com/acc',
        stripe: 'https://dashboard.stripe.com/test'
      }
    });

    expect(html).toMatch(/Hub health matrix/);
    expect(html).toMatch(/Cloudflare/);
    expect(html).toMatch(/Billing/);
    expect(html).toMatch(/Marketing & signup/);
    expect(html).toMatch(/demo\.lovely-home\.co\.uk/);
  });
});
