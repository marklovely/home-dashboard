import { describe, expect, it, vi, beforeEach } from 'vitest';
import { shouldDispatchSignupRegistry } from '../functions/api/platform/platformBillingRegistry.js';

vi.mock('../functions/api/platform/platformGitHub.js', () => ({
  dispatchSiteManageWorkflow: vi.fn(),
  githubAutomationConfigured: vi.fn(() => true)
}));

const { maybeDispatchSignupRegistry } = await import(
  '../functions/api/platform/platformBillingRegistry.js'
);
const { dispatchSiteManageWorkflow } = await import('../functions/api/platform/platformGitHub.js');

const emptyManifest = { sites: {}, platform: { customerZoneName: 'lovely-hub.com' } };

function fakeDb() {
  /** @type {string[]} */
  const statements = [];
  return {
    statements,
    prepare(sql) {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      const api = {
        bind: () => api,
        run: async () => ({ success: true }),
        first: async () => null
      };
      return api;
    }
  };
}

describe('signup registry gating', () => {
  it('creates the registry entry for a paid trial that is not registered yet', () => {
    const decision = shouldDispatchSignupRegistry({
      eventType: 'checkout.session.completed',
      status: 'trialing',
      siteId: 'rose-cottage',
      existingBilling: null,
      manifestSite: null
    });
    expect(decision).toMatchObject({ dispatch: true, reason: 'paid_needs_registry' });
  });

  it('refuses when the subscription is not paid for', () => {
    for (const status of ['incomplete', 'canceled', 'past_due']) {
      const decision = shouldDispatchSignupRegistry({
        eventType: 'checkout.session.completed',
        status,
        siteId: 'rose-cottage',
        existingBilling: null,
        manifestSite: null
      });
      expect(decision).toMatchObject({ dispatch: false, reason: 'not_paid' });
    }
  });

  it('refuses when the site is already registered', () => {
    const decision = shouldDispatchSignupRegistry({
      eventType: 'checkout.session.completed',
      status: 'trialing',
      siteId: 'smith',
      existingBilling: null,
      manifestSite: { siteId: 'smith' }
    });
    expect(decision).toMatchObject({ dispatch: false, reason: 'already_registered' });
  });

  it('does not open a second pull request on webhook replay', () => {
    const decision = shouldDispatchSignupRegistry({
      eventType: 'customer.subscription.created',
      status: 'trialing',
      siteId: 'rose-cottage',
      existingBilling: { registry_dispatched_at: 1_700_000_000 },
      manifestSite: null
    });
    expect(decision).toMatchObject({ dispatch: false, reason: 'already_dispatched' });
  });

  it('ignores unrelated events and protected sites', () => {
    expect(
      shouldDispatchSignupRegistry({
        eventType: 'invoice.payment_failed',
        status: 'trialing',
        siteId: 'rose-cottage',
        manifestSite: null
      })
    ).toMatchObject({ dispatch: false, reason: 'event_type' });

    expect(
      shouldDispatchSignupRegistry({
        eventType: 'checkout.session.completed',
        status: 'trialing',
        siteId: 'production',
        manifestSite: null
      })
    ).toMatchObject({ dispatch: false, reason: 'blocked_site' });
  });
});

describe('signup registry dispatch', () => {
  beforeEach(() => {
    vi.mocked(dispatchSiteManageWorkflow).mockReset();
  });

  it('never sends the customer email to the registry workflow', async () => {
    vi.mocked(dispatchSiteManageWorkflow).mockResolvedValue({
      ok: true,
      workflow: 'platform-site-manage.yml',
      message: 'started'
    });
    const db = fakeDb();

    const result = await maybeDispatchSignupRegistry(
      /** @type {never} */ ({}),
      /** @type {never} */ (db),
      emptyManifest,
      {
        siteId: 'rose-cottage',
        eventType: 'checkout.session.completed',
        status: 'trialing',
        existingBilling: null
      }
    );

    expect(result).toMatchObject({ ok: true, action: 'registry_dispatched' });
    const payload = vi.mocked(dispatchSiteManageWorkflow).mock.calls[0][2];
    expect(payload).toMatchObject({
      siteId: 'rose-cottage',
      hostname: 'rose-cottage.lovely-hub.com',
      terraform: true
    });
    expect(JSON.stringify(payload)).not.toMatch(/@/);
    expect(db.statements.join(' ')).toContain('registry_dispatched_at');
  });

  it('records the failure so the operator can retry', async () => {
    vi.mocked(dispatchSiteManageWorkflow).mockResolvedValue({
      ok: false,
      error: 'GITHUB_DISPATCH_FAILED',
      message: 'token missing'
    });
    const db = fakeDb();

    const result = await maybeDispatchSignupRegistry(
      /** @type {never} */ ({}),
      /** @type {never} */ (db),
      emptyManifest,
      {
        siteId: 'rose-cottage',
        eventType: 'checkout.session.completed',
        status: 'trialing',
        existingBilling: null
      }
    );

    expect(result).toMatchObject({ ok: false, error: 'REGISTRY_DISPATCH_FAILED' });
    expect(db.statements.join(' ')).toContain('registry_last_error');
  });
});
