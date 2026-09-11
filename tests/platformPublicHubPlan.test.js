import { describe, expect, it, vi } from 'vitest';
import { resolveBillingRowPlanTier } from '../functions/api/platform/platformPublicHubPlan.js';

describe('resolveBillingRowPlanTier', () => {
  const env = {
    STRIPE_SECRET_KEY: 'sk_test',
    STRIPE_PRICE_ID: 'price_plus_month',
    STRIPE_PRICE_ID_FREE: 'price_free_test'
  };

  it('syncs plan_tier from Stripe when D1 still says free after upgrade', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: 'sub_plus',
        items: { data: [{ price: { id: 'price_plus_month', unit_amount: 499 } }] }
      })
    }));
    vi.stubGlobal('fetch', fetchMock);

    /** @type {Record<string, unknown>} */
    let stored = {
      site_id: 'test-cottage-free',
      stripe_customer_id: 'cus_free',
      stripe_subscription_id: 'sub_plus',
      status: 'active',
      plan_tier: 'free',
      owner_email: 'owner@example.com'
    };

    const db = {
      prepare(sql) {
        return {
          bind() {
            return {
              async run() {
                if (sql.includes('INSERT INTO site_billing')) {
                  stored = { ...stored, plan_tier: 'plus' };
                }
                return { meta: { changes: 1 } };
              },
              async first() {
                if (sql.includes('FROM platform_settings')) return null;
                return null;
              }
            };
          }
        };
      }
    };

    const resolved = await resolveBillingRowPlanTier(
      env,
      /** @type {D1Database} */ (db),
      stored
    );
    expect(resolved?.plan_tier).toBe('plus');
    expect(fetchMock).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
