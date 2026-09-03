import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  d1UpdateChangedRow,
  shouldDispatchSignupRegistry
} from '../functions/api/platform/platformBillingRegistry.js';

const { maybeDispatchSignupRegistry } = await import(
  '../functions/api/platform/platformBillingRegistry.js'
);

const emptyManifest = { sites: {}, platform: { customerZoneName: 'lovely-hub.com' } };

function fakeDb(claimChanges = 1) {
  /** @type {string[]} */
  const statements = [];
  return {
    statements,
    prepare(sql) {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      const api = {
        bind: () => api,
        run: async () => ({
          success: true,
          meta: { changes: sql.includes('registry_dispatched_at IS NULL') ? claimChanges : 1 }
        }),
        first: async () => null
      };
      return api;
    }
  };
}

function fakeProvisionQueue() {
  /** @type {unknown[]} */
  const sent = [];
  return {
    sent,
    send: vi.fn(async (body) => {
      sent.push(body);
    })
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

  it('does not enqueue a second job on webhook replay', () => {
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

describe('signup provision enqueue', () => {
  /** @type {ReturnType<typeof fakeProvisionQueue>} */
  let queue;

  beforeEach(() => {
    queue = fakeProvisionQueue();
  });

  it('never sends the customer email onto the provision queue', async () => {
    const db = fakeDb();
    const result = await maybeDispatchSignupRegistry(
      { HUB_PROVISION_QUEUE: queue },
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
    expect(queue.sent[0]).toEqual({ siteId: 'rose-cottage', action: 'provision' });
    expect(JSON.stringify(queue.sent[0])).not.toMatch(/@/);
    expect(db.statements.join(' ')).toContain('registry_dispatched_at IS NULL');
  });

  it('lets only one of two concurrent Stripe events enqueue', async () => {
    const db = fakeDb(0);
    const result = await maybeDispatchSignupRegistry(
      { HUB_PROVISION_QUEUE: queue },
      /** @type {never} */ (db),
      emptyManifest,
      {
        siteId: 'rose-cottage',
        eventType: 'customer.subscription.created',
        status: 'trialing',
        existingBilling: null
      }
    );

    expect(result).toEqual({ ok: true, action: 'registry_already_dispatched' });
    expect(queue.send).not.toHaveBeenCalled();
  });

  it('records the failure so the operator can retry', async () => {
    const db = fakeDb();
    const result = await maybeDispatchSignupRegistry(
      {},
      /** @type {never} */ (db),
      emptyManifest,
      {
        siteId: 'rose-cottage',
        eventType: 'checkout.session.completed',
        status: 'trialing',
        existingBilling: null
      }
    );

    expect(result).toMatchObject({ ok: false, error: 'QUEUE_NOT_CONFIGURED' });
    expect(db.statements.join(' ')).toContain('registry_last_error');
    expect(db.statements.join(' ')).toMatch(/registry_dispatched_at = NULL/);
  });
});

describe('registry D1 claim result', () => {
  it('treats a D1 UPDATE with changes as a won claim', () => {
    expect(d1UpdateChangedRow({ meta: { changes: 1 } })).toBe(true);
    expect(d1UpdateChangedRow({ meta: { changes: 0 } })).toBe(false);
    expect(d1UpdateChangedRow({})).toBe(false);
  });
});

describe('registry manage PR branch', () => {
  it('uses a stable branch name so a second workflow updates the same PR', () => {
    const yaml = readFileSync(resolve(process.cwd(), '.github/workflows/platform-site-manage.yml'), 'utf8');
    expect(yaml).toMatch(
      /branch:\s*platform\/site-\$\{\{\s*steps\.manage\.outputs\.site_id\s*\}\}-\$\{\{\s*inputs\.action\s*\}\}/
    );
    expect(yaml).not.toMatch(/branch:.*github\.run_id/);
  });
});
