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
      '£0 today — then £9.99/month or £99.00/year. Use the trial to set up before guests arrive.',
    vatNote: ''
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
   * Drop VAT claims from API copy. Prices are not VAT-inclusive (not VAT registered).
   * @param {string} text
   */
  function stripVatClaims(text) {
    return String(text || '')
      .replace(/\s*\(inc\.?\s*VAT\)/gi, '')
      .replace(/\s*inc\.?\s*VAT\.?/gi, '')
      .replace(/\s*Prices include VAT\.?/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
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
      checkoutSummary: stripVatClaims(
        (pricing.checkoutSummary && String(pricing.checkoutSummary)) ||
          STATIC_FALLBACK.checkoutSummary
      ),
      signupSummary: stripVatClaims(
        (pricing.signupSummary && String(pricing.signupSummary)) ||
          STATIC_FALLBACK.signupSummary
      ),
      vatNote: ''
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
   * Short promo line for banners and the home hero (drops the parenthetical timing detail).
   * @param {Record<string, unknown> | null | undefined} intro
   */
  function buildIntroPromoLine(intro) {
    const stripTiming = (text) => String(text || '').replace(/\s*\([^)]*\)\s*\.?$/, '').trim();
    const month = stripTiming(intro?.monthlyBenefit);
    const year = stripTiming(intro?.yearlyBenefit);
    if (month && year) {
      const yearPhrase = year.charAt(0).toLowerCase() + year.slice(1);
      return month + ' — or ' + yearPhrase + '.';
    }
    return month || year || 'Introductory discount for new households.';
  }

  /**
   * @param {Record<string, unknown>} pricing
   */
  function applyIntroOffer(pricing) {
    const intro = pricing.introOffer && typeof pricing.introOffer === 'object' ? pricing.introOffer : null;
    const active = intro?.active === true;

    const introSections = '.home-intro-offer, .site-banner--intro, .pricing-intro-offer, #signup-intro-banner';

    document.querySelectorAll('[data-intro-offer="promo-line"]').forEach((el) => {
      const section = el.closest(introSections);
      const banner = el.closest('#home-intro-banner');
      if (!active) {
        if (section instanceof HTMLElement) section.hidden = true;
        if (banner instanceof HTMLElement) banner.hidden = true;
        el.textContent = '';
        return;
      }
      el.textContent = buildIntroPromoLine(intro);
      if (section instanceof HTMLElement) section.hidden = false;
      if (banner instanceof HTMLElement) banner.hidden = false;
    });

    document.querySelectorAll('[data-intro-offer="headline"]').forEach((el) => {
      const section = el.closest(introSections);
      if (!active) {
        if (section instanceof HTMLElement) section.hidden = true;
        el.textContent = '';
        return;
      }
      const monthly = intro?.monthlyBenefit ? String(intro.monthlyBenefit) : '';
      const yearly = intro?.yearlyBenefit ? String(intro.yearlyBenefit) : '';
      el.textContent =
        'Introductory offer for new households: ' +
        (monthly && yearly ? monthly + ' (monthly) or ' + yearly + ' (yearly).' : monthly || yearly || 'discount at checkout.');
      if (section instanceof HTMLElement) section.hidden = false;
    });

    document.querySelectorAll('[data-intro-offer="checkout-note"]').forEach((el) => {
      el.textContent = active && intro?.checkoutNote ? String(intro.checkoutNote) : '';
    });

    document.querySelectorAll('[data-intro-offer="pricing-band-note"]').forEach((el) => {
      if (!active) {
        el.hidden = true;
        el.textContent = '';
        return;
      }
      el.hidden = false;
      el.textContent =
        'New households: ' +
        buildIntroPromoLine(intro) +
        ' Applied at secure checkout after your free trial — not on referrals (friend links keep their own discount).';
    });

    const offersSection = document.getElementById('offers');
    if (offersSection instanceof HTMLElement) {
      offersSection.hidden = !active;
    }

    document.querySelectorAll('[data-intro-offer="monthly-benefit"]').forEach((el) => {
      el.textContent = active && intro?.monthlyBenefit ? String(intro.monthlyBenefit) : '';
    });

    document.querySelectorAll('[data-intro-offer="yearly-benefit"]').forEach((el) => {
      el.textContent = active && intro?.yearlyBenefit ? String(intro.yearlyBenefit) : '';
    });
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
      const demoSuffix = el.getAttribute('data-demo-suffix') || '';
      el.innerHTML =
        '<strong>' +
        trialDays +
        '-day trial</strong> to set up before guests arrive — <strong>£0 today</strong>, then <strong>' +
        escapeHtml(monthlyLabel) +
        '</strong> or <strong>' +
        escapeHtml(yearlyLabel) +
        '</strong>. Cancel anytime before billing starts.' +
        (demoSuffix ? ' ' + demoSuffix : '');
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
    applyIntroOffer(pricing);
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

  window.LovelyHomePricing = {
    loadPricing,
    applyPricing,
    applyIntroOffer,
    buildIntroPromoLine,
    initPricing,
    resolveApiBase,
    STATIC_FALLBACK,
    normalizePricing
  };
})();
