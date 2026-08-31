(function () {
  const DEFAULT_API = 'https://platform.lovely-home.co.uk';

  const STATIC_FALLBACK = {
    configured: false,
    trialDays: 7,
    productName: 'Household Hub',
    plans: {
      month: { interval: 'month', label: '£9.99/month', amount: 9.99, currency: 'gbp' },
      year: { interval: 'year', label: '£99.00/year', amount: 99, currency: 'gbp' }
    },
    monthlyLabel: '£9.99/month',
    yearlyLabel: '£99.00/year',
    annualSavingsLabel: 'Save £20.88 vs paying monthly',
    annualSavingsPercent: 17,
    checkoutSummary:
      '£0 today — then £9.99/month or £99.00/year after your 7-day trial. Cancel anytime before then.',
    signupSummary:
      '£0 today — choose £9.99/month or £99.00/year after the trial. Cancel anytime before billing starts.'
  };

  /**
   * @param {string} [apiBaseOverride]
   */
  function resolveApiBase(apiBaseOverride) {
    if (apiBaseOverride) return apiBaseOverride.replace(/\/$/, '');
    const meta = document.querySelector('meta[name="lovely-platform-api"]');
    return (meta?.content || DEFAULT_API).replace(/\/$/, '');
  }

  /**
   * Merge API payload with static fallbacks so cards never show "…" when we know the list price.
   * @param {Record<string, unknown>} pricing
   */
  function normalizePricing(pricing) {
    const plans = pricing.plans && typeof pricing.plans === 'object' ? pricing.plans : {};
    const monthPlan = plans.month || STATIC_FALLBACK.plans.month;
    const yearPlan = plans.year || STATIC_FALLBACK.plans.year;
    const monthlyLabel =
      (pricing.monthlyLabel && String(pricing.monthlyLabel)) ||
      (monthPlan?.label && String(monthPlan.label)) ||
      STATIC_FALLBACK.monthlyLabel;
    const yearlyLabel =
      (pricing.yearlyLabel && String(pricing.yearlyLabel)) ||
      (yearPlan?.label && String(yearPlan.label)) ||
      STATIC_FALLBACK.yearlyLabel;

    let annualSavingsPercent = Number(pricing.annualSavingsPercent);
    if (!Number.isFinite(annualSavingsPercent) || annualSavingsPercent <= 0) {
      annualSavingsPercent = STATIC_FALLBACK.annualSavingsPercent;
    }

    return {
      ...STATIC_FALLBACK,
      ...pricing,
      trialDays: Number(pricing.trialDays) || STATIC_FALLBACK.trialDays,
      productName: pricing.productName ? String(pricing.productName) : STATIC_FALLBACK.productName,
      plans: { month: monthPlan, year: yearPlan },
      monthlyLabel,
      yearlyLabel,
      annualSavingsPercent,
      annualSavingsLabel:
        (pricing.annualSavingsLabel && String(pricing.annualSavingsLabel)) ||
        STATIC_FALLBACK.annualSavingsLabel,
      checkoutSummary:
        (pricing.checkoutSummary && String(pricing.checkoutSummary)) ||
        STATIC_FALLBACK.checkoutSummary,
      signupSummary:
        (pricing.signupSummary && String(pricing.signupSummary)) ||
        STATIC_FALLBACK.signupSummary
    };
  }

  /**
   * @param {string} [apiBaseOverride]
   */
  async function loadPricing(apiBaseOverride) {
    const apiBase = resolveApiBase(apiBaseOverride);
    try {
      const response = await fetch(apiBase + '/api/public/signup/pricing', {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('pricing unavailable');
      const pricing = await response.json();
      return normalizePricing(pricing);
    } catch {
      return normalizePricing(STATIC_FALLBACK);
    }
  }

  /**
   * @param {Record<string, unknown>} pricing
   */
  function applyPricing(pricing) {
    const normalized = normalizePricing(pricing);
    const trialDays = normalized.trialDays;
    const monthlyLabel = normalized.monthlyLabel;
    const yearlyLabel = normalized.yearlyLabel;
    const productName = normalized.productName;
    const checkoutSummary = normalized.checkoutSummary;
    const signupSummary = normalized.signupSummary;
    const savingsLabel = normalized.annualSavingsLabel;
    const savingsPercent = normalized.annualSavingsPercent;

    document.querySelectorAll('[data-pricing="trial-days"]').forEach((el) => {
      el.textContent = String(trialDays);
    });

    document.querySelectorAll('[data-pricing="product-name"]').forEach((el) => {
      el.textContent = productName;
    });

    document.querySelectorAll('[data-pricing="monthly-label"]').forEach((el) => {
      el.textContent = monthlyLabel;
    });

    document.querySelectorAll('[data-pricing="yearly-label"]').forEach((el) => {
      el.textContent = yearlyLabel;
    });

    document.querySelectorAll('[data-pricing="checkout-summary"]').forEach((el) => {
      el.textContent = checkoutSummary;
    });

    document.querySelectorAll('[data-pricing="signup-summary"]').forEach((el) => {
      el.textContent = signupSummary;
    });

    document.querySelectorAll('[data-pricing="annual-savings"]').forEach((el) => {
      if (savingsPercent) {
        el.textContent = 'Save ' + savingsPercent + '%';
        el.hidden = false;
      } else if (savingsLabel) {
        el.textContent = savingsLabel;
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });

    document.querySelectorAll('[data-pricing="hero-note"]').forEach((el) => {
      el.innerHTML =
        '<strong>' +
        trialDays +
        '-day trial</strong> — <strong>£0 today</strong>, then <strong>' +
        escapeHtml(monthlyLabel) +
        '</strong> or <strong>' +
        escapeHtml(yearlyLabel) +
        '</strong>. Cancel anytime before billing starts.';
    });

    document.querySelectorAll('[data-pricing="dual-summary"]').forEach((el) => {
      el.innerHTML =
        '<strong>' +
        escapeHtml(monthlyLabel) +
        '</strong> or <strong>' +
        escapeHtml(yearlyLabel) +
        '</strong>';
    });

    document.querySelectorAll('[data-pricing="plan-amount"]').forEach((el) => {
      const plan = el.getAttribute('data-plan') === 'year' ? 'year' : 'month';
      renderPlanAmount(el, plan === 'year' ? yearlyLabel : monthlyLabel);
    });

    document.querySelectorAll('[data-pricing="price-card-amount"]').forEach((el) => {
      renderPlanAmount(el, monthlyLabel);
    });

    document.querySelectorAll('[data-pricing="interval-label"]').forEach((el) => {
      const plan = el.getAttribute('data-plan');
      el.textContent = plan === 'year' ? yearlyLabel : monthlyLabel;
    });

    document.documentElement.classList.add('pricing-loaded');
  }

  /**
   * @param {Element} el
   * @param {string} label
   */
  function renderPlanAmount(el, label) {
    const parts = label.split('/');
    el.innerHTML =
      '<span class="pricing-amount">' +
      escapeHtml(parts[0] || label) +
      '</span>' +
      (parts[1] ? '<span class="pricing-interval">/' + escapeHtml(parts[1]) + '</span>' : '');
  }

  /**
   * @param {string} value
   */
  function escapeHtml(value) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * @param {string} [apiBaseOverride]
   */
  async function initPricing(apiBaseOverride) {
    const pricing = await loadPricing(apiBaseOverride);
    applyPricing(pricing);
    return pricing;
  }

  window.LovelyHomePricing = { loadPricing, applyPricing, initPricing, resolveApiBase, STATIC_FALLBACK, normalizePricing };
})();
