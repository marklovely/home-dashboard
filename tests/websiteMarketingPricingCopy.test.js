import { describe, expect, it } from 'vitest';
import {
  buildPlaceholderMap,
  buildPricingMetaDescription,
  substituteHelpCatalogPricing,
  substituteMarketingPlaceholders
} from '../website/marketingPricingCopy.js';
import { OWNER_HELP_SECTIONS } from '../src/help/ownerSections.js';

describe('website marketing pricing copy', () => {
  const pricing = {
    billingTrialDays: 7,
    trialDays: 7,
    monthlyLabel: '£8.99/month',
    yearlyLabel: '£89/year',
    displayCopy: {
      billingTrialDays: 7,
      introMonthlyBenefit: '20% off each of your first two months (starting on your first invoice after the trial)',
      introYearlyBenefit: '25% off your first year (applied on your first invoice after the trial)',
      referralMonthlyReferee: '£4 off each of their first two months (starting on the first invoice after the trial)',
      referralMonthlyReferrer: '£8 account credit when their first invoice is paid',
      referralYearlyReferee: '£12 off their first year (on the first invoice after the trial)',
      referralYearlyReferrer: '£12 account credit when their first invoice is paid'
    }
  };

  it('substitutes billing and offer placeholders in help templates', () => {
    const template =
      'Use the {billingTrialDays}-day trial. Intro: {introMonthlyBenefit}. Friend: {referralMonthlyReferee}.';
    const resolved = substituteMarketingPlaceholders(template, pricing);
    expect(resolved).toMatch(/Use the 7-day trial/);
    expect(resolved).toMatch(/20% off each of your first two months/);
    expect(resolved).toMatch(/£4 off each of their first two months/);
    expect(resolved).not.toMatch(/\{/);
  });

  it('hydrates the owner help catalog from pricing API data', () => {
    const catalog = substituteHelpCatalogPricing({ owner: OWNER_HELP_SECTIONS, sitter: [] }, pricing);
    const faq = catalog.owner.find((section) => section.id === 'common-questions');
    const referral = faq?.blocks.find((block) => block.type === 'p' && block.text.includes('Refer another household'));
    expect(referral?.text).toMatch(/£4 off each of their first two months/);
    expect(referral?.text).toMatch(/£8 account credit/);
    expect(referral?.text).not.toMatch(/\{referral/);
  });

  it('builds meta descriptions from live labels', () => {
    expect(buildPricingMetaDescription(pricing)).toBe(
      'Lovely Home pricing — £8.99/month or £89/year for your private household hub. 7-day free trial. Cancel anytime.'
    );
  });

  it('uses billingTrialDays for charge timing placeholders', () => {
    const map = buildPlaceholderMap({ billingTrialDays: 7, trialDays: 14, displayCopy: { billingTrialDays: 7 } });
    expect(map.billingTrialDays).toBe('7');
    expect(map.trialDays).toBe('14');
  });
});
