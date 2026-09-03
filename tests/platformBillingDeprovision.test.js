import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BILLING_DEPROVISION_BLOCKED_SITE_IDS,
  shouldDispatchBillingDeprovision
} from '../functions/api/platform/platformBillingDeprovision.js';
import { handleStripeBillingEvent } from '../functions/api/platform/platformBilling.js';

vi.mock('../functions/api/platform/platformGitHub.js', () => ({
  dispatchSiteProvisionWorkflow: vi.fn()
}));

describe('billing deprovision helpers', () => {
  it('dispatches for subscription.deleted when site was live', () => {
    const decision = shouldDispatchBillingDeprovision({
      eventType: 'customer.subscription.deleted',
      status: 'canceled',
      siteId: 'practice',
      existingBilling: { status: 'active', provision_dispatched_at: Date.now() },
      manifestSite: { siteId: 'practice', contract: { d1_database_id: 'abc' } }
    });
    expect(decision).toEqual({ dispatch: true, reason: 'canceled_needs_deprovision' });
  });

  it('skips past_due without deprovision trigger on payment failed path', () => {
    const decision = shouldDispatchBillingDeprovision({
      eventType: 'invoice.payment_failed',
      status: 'past_due',
      siteId: 'practice',
      existingBilling: { status: 'active' },
      manifestSite: { siteId: 'practice' }
    });
    expect(decision.reason).toBe('not_canceled');
  });

  it('skips blocked platform sites', () => {
    for (const siteId of BILLING_DEPROVISION_BLOCKED_SITE_IDS) {
      const decision = shouldDispatchBillingDeprovision({
        eventType: 'customer.subscription.deleted',
        status: 'canceled',
        siteId,
        existingBilling: { status: 'active' },
        manifestSite: { siteId, contract: null }
      });
      expect(decision.reason).toBe('blocked_site');
    }
  });

  it('skips when deprovision already dispatched for a canceled billing row', () => {
    const decision = shouldDispatchBillingDeprovision({
      eventType: 'customer.subscription.deleted',
      status: 'canceled',
      siteId: 'practice',
      existingBilling: { status: 'canceled', deprovision_dispatched_at: Date.now() },
      manifestSite: { siteId: 'practice' }
    });
    expect(decision.reason).toBe('already_dispatched');
  });

  it('dispatches when billing was trialing even if platform-manifest is stale', () => {
    const decision = shouldDispatchBillingDeprovision({
      eventType: 'customer.subscription.deleted',
      status: 'canceled',
      siteId: 'e2e-abc',
      existingBilling: { status: 'trialing' },
      manifestSite: null
    });
    expect(decision).toEqual({ dispatch: true, reason: 'canceled_needs_deprovision' });
  });

  it('skips a cancel with no billing history and no registry entry', () => {
    const decision = shouldDispatchBillingDeprovision({
      eventType: 'customer.subscription.deleted',
      status: 'canceled',
      siteId: 'e2e-abc',
      existingBilling: null,
      manifestSite: null
    });
    expect(decision.reason).toBe('site_not_in_manifest');
  });

  it('dispatches again when hub was live after a prior deprovision dispatch', () => {
    const decision = shouldDispatchBillingDeprovision({
      eventType: 'customer.subscription.deleted',
      status: 'canceled',
      siteId: 'practice',
      existingBilling: {
        status: 'trialing',
        deprovision_dispatched_at: Date.now(),
        provision_dispatched_at: Date.now()
      },
      manifestSite: { siteId: 'practice', contract: { d1_database_id: 'abc' } }
    });
    expect(decision).toEqual({ dispatch: true, reason: 'canceled_needs_deprovision' });
  });

  it('skips subscription.updated when billing was already canceled', () => {
    const decision = shouldDispatchBillingDeprovision({
      eventType: 'customer.subscription.updated',
      status: 'canceled',
      siteId: 'practice',
      existingBilling: { status: 'canceled' },
      manifestSite: { siteId: 'practice', provision_dispatched_at: 1 }
    });
    expect(decision.reason).toBe('already_canceled');
  });
});

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
              deprovision_dispatched_at: existing?.deprovision_dispatched_at ?? null,
              deprovision_last_error: existing?.deprovision_last_error ?? null,
              created_at: existing?.created_at ?? created_at,
              updated_at
            });
          }
          if (sql.includes('UPDATE site_billing') && sql.includes('deprovision_dispatched_at')) {
            const [deprovision_dispatched_at, updated_at, site_id] = bound;
            const existing = siteBilling.get(String(site_id)) ?? { site_id };
            siteBilling.set(String(site_id), {
              ...existing,
              deprovision_dispatched_at,
              deprovision_last_error: null,
              updated_at
            });
          }
          if (sql.includes('UPDATE site_billing') && sql.includes('deprovision_last_error')) {
            const [deprovision_last_error, updated_at, site_id] = bound;
            const existing = siteBilling.get(String(site_id)) ?? { site_id };
            siteBilling.set(String(site_id), {
              ...existing,
              deprovision_last_error,
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
        }
      };
    },
    webhookEvents,
    siteBilling
  };
}

describe('handleStripeBillingEvent deprovision dispatch', () => {
  /** @type {{ sent: unknown[], send: ReturnType<typeof vi.fn> }} */
  let queue;

  beforeEach(() => {
    queue = {
      sent: [],
      send: vi.fn(async (body) => {
        queue.sent.push(body);
      })
    };
  });

  it('enqueues hub teardown on subscription.deleted', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    db.siteBilling.set('practice', {
      site_id: 'practice',
      stripe_customer_id: 'cus_practice',
      status: 'active',
      provision_dispatched_at: Date.now()
    });

    const manifest = {
      sites: {
        practice: { siteId: 'practice', contract: { d1_database_id: 'abc' } }
      }
    };

    const result = await handleStripeBillingEvent(
      db,
      {
        id: 'evt_sub_deleted',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_practice',
            customer: 'cus_practice',
            status: 'canceled',
            metadata: { site_id: 'practice' }
          }
        }
      },
      { env: { HUB_PROVISION_QUEUE: queue }, manifest }
    );

    expect(result.ok).toBe(true);
    expect(result.deprovision).toMatchObject({ action: 'deprovision_dispatched' });
    expect(queue.sent).toEqual([{ siteId: 'practice', action: 'teardown' }]);
  });

  it('enqueues teardown after re-trial when prior deprovision flag is stale', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    db.siteBilling.set('practice', {
      site_id: 'practice',
      stripe_customer_id: 'cus_practice',
      stripe_subscription_id: 'sub_practice',
      status: 'trialing',
      deprovision_dispatched_at: Date.now(),
      provision_dispatched_at: Date.now()
    });

    const manifest = {
      sites: {
        practice: { siteId: 'practice', contract: { d1_database_id: 'abc' } }
      }
    };

    const result = await handleStripeBillingEvent(
      db,
      {
        id: 'evt_sub_deleted_retest',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_practice',
            customer: 'cus_practice',
            status: 'canceled',
            metadata: { site_id: 'practice' }
          }
        }
      },
      { env: { HUB_PROVISION_QUEUE: queue }, manifest }
    );

    expect(result.ok).toBe(true);
    expect(result.deprovision).toMatchObject({ action: 'deprovision_dispatched' });
    expect(queue.sent).toEqual([{ siteId: 'practice', action: 'teardown' }]);
  });

  it('does not deprovision on invoice.payment_failed', async () => {
    const db = /** @type {D1Database} */ (createBillingDbMock());
    db.siteBilling.set('practice', {
      site_id: 'practice',
      stripe_customer_id: 'cus_practice',
      status: 'active'
    });

    const result = await handleStripeBillingEvent(
      db,
      {
        id: 'evt_pay_fail',
        type: 'invoice.payment_failed',
        data: {
          object: {
            customer: 'cus_practice',
            subscription: 'sub_practice',
            metadata: { site_id: 'practice' }
          }
        }
      },
      { env: { HUB_PROVISION_QUEUE: queue }, manifest: { sites: { practice: {} } } }
    );

    expect(result.ok).toBe(true);
    expect(result.deprovision).toMatchObject({ action: 'deprovision_not_canceled' });
    expect(queue.send).not.toHaveBeenCalled();
  });
});
