import { describe, expect, it } from 'vitest';
import {
  billingStatusBadgeClass,
  billingStatusLabel,
  canStartBillingTrial,
  formatBillingTrialEnd,
  renderSiteBilling
} from '../platform-admin/src/billing.js';

describe('platform admin billing UI', () => {
  it('allows trial checkout for terraform sites without billing', () => {
    expect(canStartBillingTrial('practice', null, true)).toBe(true);
    expect(canStartBillingTrial('production', null, true)).toBe(false);
    expect(canStartBillingTrial('demo', null, true)).toBe(false);
    expect(canStartBillingTrial('practice', { status: 'trialing' }, true)).toBe(false);
    expect(canStartBillingTrial('practice', { status: 'canceled' }, true)).toBe(true);
  });

  it('maps billing status labels and badge tones', () => {
    expect(billingStatusLabel('trialing')).toBe('Trial');
    expect(billingStatusBadgeClass('trialing')).toBe('badge-ok');
    expect(billingStatusBadgeClass('past_due')).toBe('badge-warn');
    expect(billingStatusBadgeClass('canceled')).toBe('badge-bad');
  });

  it('formats trial end dates', () => {
    const formatted = formatBillingTrialEnd(Date.parse('2026-09-15T12:00:00Z'));
    expect(formatted).toMatch(/Sep|15|2026/);
  });

  it('renders start trial when no billing record exists', () => {
    const html = renderSiteBilling(
      { siteId: 'practice', terraform: true },
      null,
      { stripeConfigured: true, billingDbConfigured: true }
    );
    expect(html).toContain('Start 7-day trial');
    expect(html).toContain('data-billing-checkout="practice"');
  });

  it('shows provision hint when trialing without terraform contract', () => {
    const html = renderSiteBilling(
      { siteId: 'practice', terraform: true, contract: null },
      { status: 'trialing', trial_end: Date.now() + 86400000, provision_dispatched_at: null },
      { stripeConfigured: true, billingDbConfigured: true }
    );
    expect(html).toContain('Billing');
    expect(html).toContain('Provision');
    expect(html).toContain('not provisioned');
  });
});
