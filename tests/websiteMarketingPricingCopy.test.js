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
    monthlyLabel: '£8.99/month',
    yearlyLabel: '£89/year',
    displayCopy: {
      introMonthlyBenefit: '20% off each of your first two months (on your first paid invoice)',
      introYearlyBenefit: '25% off your first year (on your first paid invoice)',
      referralMonthlyReferee: '£4 off each of their first two months (on their first paid invoice)',
      referralMonthlyReferrer: '£8 account credit when their first invoice is paid',
      referralYearlyReferee: '£12 off their first year (on the first invoice)',
      referralYearlyReferrer: '£12 account credit when their first invoice is paid'
    }
  };

  it('substitutes billing and offer placeholders in help templates', () => {
    const template =
      'Lovely Home+ from {monthlyLabel}. Intro: {introMonthlyBenefit}. Friend: {referralMonthlyReferee}.';
    const resolved = substituteMarketingPlaceholders(template, pricing);
    expect(resolved).toMatch(/£8\.99\/month/);
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
      'Lovely Home pricing — Free forever for one home, or Lovely Home+ from £8.99/month or £89/year for unlimited guides and scheduled stays.'
    );
  });

  it('builds placeholder maps from pricing labels and display copy', () => {
    const map = buildPlaceholderMap(pricing);
    expect(map.monthlyLabel).toBe('£8.99/month');
    expect(map.introMonthlyBenefit).toMatch(/20% off/);
  });
});
