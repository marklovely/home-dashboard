import { describe, expect, it } from 'vitest';
import {
  isLiveBillingStatus,
  priorDeprovisionBlocksDispatch,
  resetBillingCycleFlags,
  shouldResetBillingCycleFlags
} from '../functions/api/platform/platformBillingLifecycle.js';

describe('platform billing lifecycle', () => {
  it('detects live billing statuses', () => {
    expect(isLiveBillingStatus('trialing')).toBe(true);
    expect(isLiveBillingStatus('active')).toBe(true);
    expect(isLiveBillingStatus('past_due')).toBe(true);
    expect(isLiveBillingStatus('canceled')).toBe(false);
  });

  it('clears stale deprovision flags on a new trialing cycle after cancel', () => {
    const decision = shouldResetBillingCycleFlags({
      status: 'trialing',
      subscriptionId: 'sub_new',
      existingBilling: {
        status: 'canceled',
        stripe_subscription_id: 'sub_old',
        deprovision_dispatched_at: Date.now(),
        provision_dispatched_at: Date.now()
      },
      manifestSite: { siteId: 'practice', contract: null }
    });
    expect(decision).toMatchObject({
      reset: true,
      clearDeprovision: true,
      clearProvision: true,
      reason: 'new_billing_cycle'
    });
  });

  it('does not reset flags when subscription stays active', () => {
    const decision = shouldResetBillingCycleFlags({
      status: 'active',
      subscriptionId: 'sub_1',
      existingBilling: {
        status: 'active',
        stripe_subscription_id: 'sub_1',
        deprovision_dispatched_at: null,
        provision_dispatched_at: Date.now()
      },
      manifestSite: { siteId: 'smith', contract: { d1_database_id: 'abc' } }
    });
    expect(decision.reset).toBe(false);
  });

  it('allows deprovision again when hub was live after prior teardown dispatch', () => {
    expect(
      priorDeprovisionBlocksDispatch({
        existingBilling: { status: 'trialing', deprovision_dispatched_at: Date.now() }
      })
    ).toBe(false);
  });

  it('blocks duplicate deprovision when billing is already canceled', () => {
    expect(
      priorDeprovisionBlocksDispatch({
        existingBilling: { status: 'canceled', deprovision_dispatched_at: Date.now() }
      })
    ).toBe(true);
  });

  it('clears registry dispatch when clearing deprovision for a re-trial', async () => {
    /** @type {string[]} */
    const statements = [];
    const db = /** @type {D1Database} */ ({
      prepare(sql) {
        statements.push(sql);
        return { bind: () => ({ run: async () => ({}) }) };
      }
    });
    await resetBillingCycleFlags(db, 'smith', { clearDeprovision: true, clearProvision: false });
    expect(statements.join(' ')).toMatch(/registry_dispatched_at = NULL/);
    expect(statements.join(' ')).toMatch(/slug_held_until = NULL/);
  });
});
