import { describe, expect, it } from 'vitest';
import {
  billableUsageRowCost,
  billableUsageRowLabel,
  currentMonthBillableUsageRange,
  formatBillableCost,
  summarizeBillableUsageRows
} from '../functions/api/platform/platformCloudflareBilling.js';

describe('platformCloudflareBilling', () => {
  it('builds the current month date range', () => {
    const range = currentMonthBillableUsageRange(new Date('2026-09-15T12:00:00Z'));
    expect(range.from).toBe('2026-09-01');
    expect(range.to).toBe('2026-09-15');
    expect(range.label).toMatch(/September 2026/);
  });

  it('summarizes billable usage rows by product', () => {
    const summary = summarizeBillableUsageRows([
      {
        x_BillableMetricName: 'Workers Standard Requests',
        BilledCost: 1.25,
        BillingCurrency: 'GBP',
        PricingQuantity: 1000,
        ConsumedUnit: 'Requests'
      },
      {
        x_BillableMetricName: 'Workers Standard Requests',
        BilledCost: 0.75,
        BillingCurrency: 'GBP',
        PricingQuantity: 500,
        ConsumedUnit: 'Requests'
      },
      {
        ChargeDescription: 'R2 Storage',
        BilledCost: 2.5,
        BillingCurrency: 'GBP',
        ConsumedQuantity: 12,
        ConsumedUnit: 'GB'
      }
    ]);

    expect(summary.totalCost).toBe(4.5);
    expect(summary.currency).toBe('GBP');
    expect(summary.products).toHaveLength(2);
    expect(summary.products[0]).toMatchObject({
      label: 'Workers Standard Requests',
      cost: 2,
      quantity: 1500,
      unit: 'Requests'
    });
  });

  it('formats billable row labels and costs', () => {
    expect(
      billableUsageRowLabel({
        x_BillableMetricName: 'D1 Rows Read'
      })
    ).toBe('D1 Rows Read');
    expect(billableUsageRowCost({ BilledCost: 3.5 })).toBe(3.5);
    expect(formatBillableCost(12.34, 'GBP')).toMatch(/12\.34/);
  });
});
