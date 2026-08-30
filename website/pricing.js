(function () {
  const DEFAULT_API = 'https://platform.lovely-home.co.uk';

  const STATIC_FALLBACK = {
    configured: false,
    trialDays: 14,
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
      '£0 today — then £9.99/month or £99.00/year after your 14-day trial. Cancel anytime before then.',
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
      if (!pricing.monthlyLabel && pricing.plans?.month?.label) {
        pricing.monthlyLabel = pricing.plans.month.label;
      }
      if (!pricing.yearlyLabel && pricing.plans?.year?.label) {
        pricing.yearlyLabel = pricing.plans.year.label;
      }
      return pricing;
    } catch {
      return { ...STATIC_FALLBACK };
    }
  }

  /**
   * @param {Record<string, unknown>} pricing
   */
  function applyPricing(pricing) {
    const trialDays = Number(pricing.trialDays) || 14;
    const monthPlan = pricing.plans?.month || null;
    const yearPlan = pricing.plans?.year || null;
    const monthlyLabel = pricing.monthlyLabel ? String(pricing.monthlyLabel) : monthPlan?.label || null;
    const yearlyLabel = pricing.yearlyLabel ? String(pricing.yearlyLabel) : yearPlan?.label || null;
    const productName = pricing.productName ? String(pricing.productName) : 'Household Hub';
    const checkoutSummary = pricing.checkoutSummary ? String(pricing.checkoutSummary) : null;
    const signupSummary = pricing.signupSummary ? String(pricing.signupSummary) : null;
    const savingsLabel = pricing.annualSavingsLabel ? String(pricing.annualSavingsLabel) : null;
    const savingsPercent = Number(pricing.annualSavingsPercent) || null;

    document.querySelectorAll('[data-pricing="trial-days"]').forEach((el) => {
      el.textContent = String(trialDays);
    });

    document.querySelectorAll('[data-pricing="product-name"]').forEach((el) => {
      el.textContent = productName;
    });

    document.querySelectorAll('[data-pricing="monthly-label"]').forEach((el) => {
      el.textContent = monthlyLabel || '£9.99/month';
    });

    document.querySelectorAll('[data-pricing="yearly-label"]').forEach((el) => {
      el.textContent = yearlyLabel || '£99.00/year';
    });

    document.querySelectorAll('[data-pricing="checkout-summary"]').forEach((el) => {
      if (checkoutSummary) el.textContent = checkoutSummary;
    });

    document.querySelectorAll('[data-pricing="signup-summary"]').forEach((el) => {
      if (signupSummary) el.textContent = signupSummary;
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
      if (monthlyLabel && yearlyLabel) {
        el.innerHTML =
          '<strong>' +
          trialDays +
          '-day trial</strong> — <strong>£0 today</strong>, then <strong>' +
          escapeHtml(monthlyLabel) +
          '</strong> or <strong>' +
          escapeHtml(yearlyLabel) +
          '</strong>. Cancel anytime before billing starts.';
      } else if (monthlyLabel) {
        el.innerHTML =
          '<strong>' +
          trialDays +
          '-day trial</strong> — <strong>£0 today</strong>, then <strong>' +
          escapeHtml(monthlyLabel) +
          '</strong>. Cancel anytime before billing starts.';
      } else {
        el.innerHTML =
          '<strong>' +
          trialDays +
          '-day trial</strong> — <strong>£0 today</strong>. Price confirmed at secure checkout.';
      }
    });

    document.querySelectorAll('[data-pricing="dual-summary"]').forEach((el) => {
      if (monthlyLabel && yearlyLabel) {
        el.innerHTML =
          '<strong>' +
          escapeHtml(monthlyLabel) +
          '</strong> or <strong>' +
          escapeHtml(yearlyLabel) +
          '</strong>';
      } else if (monthlyLabel) {
        el.innerHTML = '<strong>' + escapeHtml(monthlyLabel) + '</strong>';
      }
    });

    document.querySelectorAll('[data-pricing="plan-amount"][data-plan="month"]').forEach((el) => {
      renderPlanAmount(el, monthlyLabel);
    });

    document.querySelectorAll('[data-pricing="plan-amount"][data-plan="year"]').forEach((el) => {
      renderPlanAmount(el, yearlyLabel);
    });

    document.querySelectorAll('[data-pricing="price-card-amount"]').forEach((el) => {
      renderPlanAmount(el, monthlyLabel);
    });

    document.querySelectorAll('[data-pricing="interval-label"]').forEach((el) => {
      const plan = el.getAttribute('data-plan');
      const label = plan === 'year' ? yearlyLabel : monthlyLabel;
      if (label) el.textContent = label;
    });

    document.documentElement.classList.add('pricing-loaded');
  }

  /**
   * @param {Element} el
   * @param {string | null} label
   */
  function renderPlanAmount(el, label) {
    if (label) {
      const parts = label.split('/');
      el.innerHTML =
        '<span class="pricing-amount">' +
        escapeHtml(parts[0] || label) +
        '</span>' +
        (parts[1] ? '<span class="pricing-interval">/' + escapeHtml(parts[1]) + '</span>' : '');
    } else {
      el.innerHTML = '<span class="pricing-amount pricing-amount--pending">…</span>';
    }
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

  window.LovelyHomePricing = { loadPricing, applyPricing, initPricing, resolveApiBase, STATIC_FALLBACK };
})();
