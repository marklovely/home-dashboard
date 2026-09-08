import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const pricingJs = readFileSync(resolve(root, 'website/pricing.js'), 'utf8');

function loadPricingApi() {
  new Function(pricingJs)();
  return window.LovelyHomePricing;
}

describe('website pricing intro offer', () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<section id="offers" hidden></section>' +
      '<section class="pricing-intro-offer" hidden><p data-intro-offer="headline"></p></section>' +
      '<span data-intro-offer="monthly-benefit"></span>' +
      '<span data-intro-offer="yearly-benefit"></span>';
  });

  it('hides the pricing offers summary when introOffer.active is false', () => {
    const api = loadPricingApi();
    api.applyIntroOffer({ introOffer: { active: false } });
    expect(document.getElementById('offers')?.hidden).toBe(true);
  });

  it('shows the pricing offers summary and benefit copy when introOffer.active is true', () => {
    const api = loadPricingApi();
    api.applyIntroOffer({
      introOffer: {
        active: true,
        monthlyBenefit: '25% off each of your first two months (starting on your first invoice after the trial)',
        yearlyBenefit: '30% off your first year (applied on your first invoice after the trial)',
        checkoutNote: 'Applied on Stripe checkout after your free trial.'
      }
    });
    expect(document.getElementById('offers')?.hidden).toBe(false);
    expect(document.querySelector('[data-intro-offer="monthly-benefit"]')?.textContent).toMatch(/25%/);
    expect(document.querySelector('[data-intro-offer="yearly-benefit"]')?.textContent).toMatch(/30%/);
  });
});
