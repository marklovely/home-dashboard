import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BILLING_PROVISION_BLOCKED_SITE_IDS,
  shouldDispatchBillingProvision,
  siteHasTerraformContract
} from '../functions/api/platform/platformBillingProvision.js';
import { handleStripeBillingEvent } from '../functions/api/platform/platformBilling.js';

vi.mock('../functions/api/platform/platformGitHub.js', () => ({
  dispatchSiteProvisionWorkflow: vi.fn()
}));

import { dispatchSiteProvisionWorkflow } from '../functions/api/platform/platformGitHub.js';

describe('billing provision helpers', () => {
  it('detects terraform contracts on manifest sites', () => {
    expect(siteHasTerraformContract({ contract: { d1_database_id: 'abc' } })).toBe(true);
    expect(siteHasTerraformContract({ contract: null })).toBe(false);
  });

  it('dispatches for trialing checkout when site lacks infrastructure', () => {
    const decision = shouldDispatchBillingProvision({
      eventType: 'checkout.session.completed',
      status: 'trialing',
      siteId: 'practice',
      existingBilling: null,
      manifestSite: { siteId: 'practice', contract: null }
    });
    expect(decision).toEqual({ dispatch: true, reason: 'trialing_needs_provision' });
  });

  it('skips when site already has terraform contract', () => {
    const decision = shouldDispatchBillingProvision({
      eventType: 'checkout.session.completed',
      status: 'trialing',
      siteId: 'smith',
      existingBilling: null,
      manifestSite: { contract: { d1_database_id: 'existing' } }
    });
    expect(decision.dispatch).toBe(false);
    expect(decision.reason).toBe('already_provisioned');
  });

  it('skips blocked platform sites', () => {
    for (const siteId of BILLING_PROVISION_BLOCKED_SITE_IDS) {
      const decision = shouldDispatchBillingProvision({
        eventType: 'checkout.session.completed',
        status: 'trialing',
        siteId,
        existingBilling: null,
        manifestSite: { contract: null }
      });
      expect(decision.reason).toBe('blocked_site');
    }
  });

  it('skips repeat dispatch when provision already recorded', () => {
    const decision = shouldDispatchBillingProvision({
      eventType: 'checkout.session.completed',
      status: 'trialing',
      siteId: 'practice',
      existingBilling: { provision_dispatched_at: Date.now() },
      manifestSite: { contract: null }
    });
    expect(decision.reason).toBe('already_dispatched');
  });
});

/**
 * Minimal D1 mock for billing + provision SQL used in tests.
 */
function createBillingDbMock() {
  /** @type {Map<string, Record<string, unknown>>} */
  const siteBilling = new Map();
  /** @type {Set<string>} */
  const webhookEvents = new Set();

  return {
    prepare(sql) {
      /** @type {unknown[]} */
      let bound = [];
      return {
        bind(...args) {
          bound = args;
          return this;
        },
        async run() {
          if (sql.includes('INSERT INTO site_billing')) {
            const [
              site_id,
              stripe_customer_id,
              stripe_subscription_id,
              status,
              trial_end,
              archive_r2_key,
              owner_email,
              created_at,
              updated_at
            ] = bound;
            const existing = siteBilling.get(String(site_id));
            siteBilling.set(String(site_id), {
              site_id,
              stripe_customer_id,
              stripe_subscription_id,
              status,
              trial_end,
              archive_r2_key,
              owner_email,
              provision_dispatched_at: existing?.provision_dispatched_at ?? null,
              provision_last_error: existing?.provision_last_error ?? null,
              created_at: existing?.created_at ?? created_at,
              updated_at
            });
          }
          if (sql.includes('UPDATE site_billing') && sql.includes('provision_dispatched_at')) {
            const [provision_dispatched_at, updated_at, site_id] = bound;
            const existing = siteBilling.get(String(site_id)) ?? { site_id };
            siteBilling.set(String(site_id), {
              ...existing,
              provision_dispatched_at,
              provision_last_error: null,
              updated_at
            });
          }
          if (sql.includes('UPDATE site_billing') && sql.includes('provision_last_error')) {
            const [provision_last_error, updated_at, site_id] = bound;
            const existing = siteBilling.get(String(site_id)) ?? { site_id };
            siteBilling.set(String(site_id), {
              ...existing,
              provision_last_error,
              updated_at
            });
          }
          if (sql.includes('INSERT OR IGNORE INTO stripe_webhook_events')) {
            webhookEvents.add(String(bound[0]));
          }
          return { success: true };
        },
        async first() {
          if (sql.includes('FROM site_billing WHERE site_id')) {
            return siteBilling.get(String(bound[0])) ?? null;
          }
          if (sql.includes('FROM stripe_webhook_events')) {
            return webhookEvents.has(String(bound[0])) ? { event_id: bound[0] } : null;
          }
          return null;
        },
        async all() {
          return { results: [...siteBilling.values()] };
        }
      };
    },
    webhookEvents
  };
}

describe('handleStripeBillingEvent provision dispatch', () => {
  beforeEach(() => {
    vi.mocked(dispatchSiteProvisionWorkflow).mockReset();
  });

  it('dispatches platform-site-provision for trialing checkout on unprovisioned site', async () => {
    vi.mocked(dispatchSiteProvisionWorkflow).mockResolvedValue({
      ok: true,
      siteId: 'practice',
      workflow: 'platform-site-provision.yml',
      message: 'started'
    });

    const db = /** @type {D1Database} */ (createBillingDbMock());
    const manifest = {
      sites: {
        practice: { siteId: 'practice', contract: null }
      }
    };

    const result = await handleStripeBillingEvent(
      db,
      {
        id: 'evt_checkout_practice',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_practice',
            subscription: 'sub_practice',
            metadata: { site_id: 'practice' },
            customer_details: { email: 'owner@example.com' }
          }
        }
      },
      { env: { PLATFORM_GITHUB_TOKEN: 'token', PLATFORM_GITHUB_REPO: 'marklovely/home-dashboard' }, manifest }
    );

    expect(result.ok).toBe(true);
    expect(result.provision).toMatchObject({ action: 'provision_dispatched' });
    expect(dispatchSiteProvisionWorkflow).toHaveBeenCalledWith(
      expect.objectContaining({ PLATFORM_GITHUB_TOKEN: 'token' }),
      'practice'
    );

    const stored = await db.prepare('SELECT * FROM site_billing WHERE site_id = ?').bind('practice').first();
    expect(stored?.provision_dispatched_at).toBeTruthy();
  });

  it('does not dispatch when manifest site already has terraform contract', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    const manifest = {
      sites: {
        smith: { siteId: 'smith', contract: { d1_database_id: 'abc' } }
      }
    };

    const result = await handleStripeBillingEvent(
      db,
      {
        id: 'evt_checkout_smith',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_smith',
            subscription: 'sub_smith',
            metadata: { site_id: 'smith' },
            customer_details: { email: 'owner@example.com' }
          }
        }
      },
      { env: { PLATFORM_GITHUB_TOKEN: 'token' }, manifest }
    );

    expect(result.ok).toBe(true);
    expect(result.provision).toMatchObject({ action: 'provision_already_provisioned' });
    expect(dispatchSiteProvisionWorkflow).not.toHaveBeenCalled();
  });

  it('returns failure without marking webhook processed when dispatch fails', async () => {
    vi.mocked(dispatchSiteProvisionWorkflow).mockResolvedValue({
      ok: false,
      error: 'GITHUB_DISPATCH_FAILED',
      message: 'nope'
    });

    const db = /** @type {D1Database} */ (createBillingDbMock());
    const manifest = { sites: { practice: { siteId: 'practice', contract: null } } };

    const result = await handleStripeBillingEvent(
      db,
      {
        id: 'evt_checkout_fail',
        type: 'checkout.session.completed',
        data: {
          object: {
            customer: 'cus_fail',
            subscription: 'sub_fail',
            metadata: { site_id: 'practice' },
            customer_details: { email: 'owner@example.com' }
          }
        }
      },
      { env: { PLATFORM_GITHUB_TOKEN: 'token' }, manifest }
    );

    expect(result.ok).toBe(false);
    expect(result.error).toBe('PROVISION_DISPATCH_FAILED');
    expect(db.webhookEvents.has('evt_checkout_fail')).toBe(false);
  });
});
