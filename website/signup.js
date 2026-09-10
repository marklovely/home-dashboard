(function () {
  const SITE_ID_RE = /^[a-z][a-z0-9-]{0,31}$/;
  const apiBase = (document.querySelector('meta[name="lovely-platform-api"]')?.content || 'https://platform.lovely-home.co.uk').replace(/\/$/, '');

  const form = document.getElementById('signup-form');
  const siteInput = document.getElementById('site-id');
  const emailInput = document.getElementById('owner-email');
  const submitBtn = document.getElementById('signup-submit');
  const alertBox = document.getElementById('signup-alert');
  const slugHint = document.getElementById('slug-hint');
  const challengeSlot = document.getElementById('signup-challenge');
  const planField = document.getElementById('signup-plan-field');
  const plusPanel = document.getElementById('signup-plus-panel');
  const plusToggle = document.getElementById('signup-plus-toggle');
  const plusBack = document.getElementById('signup-plus-back');
  const monthRadio = form?.querySelector('input[name="signupPlan"][value="month"]');
  const yearRadio = form?.querySelector('input[name="signupPlan"][value="year"]');

  if (!form || !siteInput || !emailInput || !submitBtn) return;

  let challengeRequired = false;

  const params = new URLSearchParams(window.location.search);
  const planParam = (params.get('plan') || '').trim().toLowerCase();
  const referralCodeParam = (params.get('ref') || '').trim();
  let activeReferralCode = referralCodeParam;
  let activeReferralInterval = null;

  function isPlusPanelOpen() {
    return Boolean(plusPanel && !plusPanel.hidden);
  }

  /**
   * @param {'month' | 'year'} [interval]
   */
  function openPlusPanel(interval) {
    if (!plusPanel) return;
    plusPanel.hidden = false;
    planField?.classList.add('signup-plan-field--plus-open');
    plusToggle?.setAttribute('aria-expanded', 'true');
    const pick = interval === 'year' ? yearRadio : monthRadio;
    if (pick) pick.checked = true;
    else if (monthRadio) monthRadio.checked = true;
    updateSignupPlanUi();
  }

  function closePlusPanel() {
    if (!plusPanel) return;
    plusPanel.hidden = true;
    planField?.classList.remove('signup-plan-field--plus-open');
    plusToggle?.setAttribute('aria-expanded', 'false');
    if (monthRadio) monthRadio.checked = false;
    if (yearRadio) yearRadio.checked = false;
    updateSignupPlanUi();
  }

  function updateSignupPlanUi() {
    setLoading(false);
  }

  if (planParam === 'year' || planParam === 'plus-year') {
    openPlusPanel('year');
  } else if (planParam === 'month' || planParam === 'plus' || planParam === 'plus-month') {
    openPlusPanel('month');
  }

  plusToggle?.addEventListener('click', () => openPlusPanel('month'));
  plusBack?.addEventListener('click', () => closePlusPanel());

  if (params.get('canceled') === '1') {
    showAlert('Checkout was canceled. You can try again when ready.', 'info');
    const canceledSite = (params.get('site') || '').trim().toLowerCase();
    if (canceledSite && SITE_ID_RE.test(canceledSite)) {
      siteInput.value = canceledSite;
    }
  }

  siteInput.addEventListener('input', () => {
    siteInput.value = siteInput.value.toLowerCase().replace(/_/g, '-').replace(/[^a-z0-9-]/g, '');
    updateSlugHint();
  });

  /**
   * Referral links are tied to monthly or yearly billing — hide the other plan.
   * @param {'month' | 'year' | null} interval
   */
  function setReferralBillingIntervalLock(interval) {
    const monthOption = monthRadio?.closest('label');
    const yearOption = yearRadio?.closest('label');
    if (!monthOption || !yearOption || !monthRadio || !yearRadio) return;

    if (interval === 'year') {
      openPlusPanel('year');
      monthOption.hidden = true;
      yearOption.hidden = false;
      plusPanel?.classList.add('billing-interval-field--locked');
      planField?.classList.add('signup-plan-field--referral-locked');
      return;
    }

    if (interval === 'month') {
      openPlusPanel('month');
      monthOption.hidden = false;
      yearOption.hidden = true;
      plusPanel?.classList.add('billing-interval-field--locked');
      planField?.classList.add('signup-plan-field--referral-locked');
      return;
    }

    closePlusPanel();
    monthOption.hidden = false;
    yearOption.hidden = false;
    plusPanel?.classList.remove('billing-interval-field--locked');
    planField?.classList.remove('signup-plan-field--referral-locked');
  }

  function selectedSignupPlan() {
    if (!isPlusPanelOpen()) return 'free';
    const checked = form.querySelector('input[name="signupPlan"]:checked')?.value;
    return checked === 'year' ? 'year' : checked === 'month' ? 'month' : 'month';
  }

  function isPlusSignup() {
    return isPlusPanelOpen();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    const siteId = siteInput.value.trim().toLowerCase();
    const email = emailInput.value.trim().toLowerCase();
    const signupPlan = selectedSignupPlan();
    const plan = signupPlan === 'free' ? 'free' : 'plus';
    const billingInterval = signupPlan === 'year' ? 'year' : 'month';

    if (!SITE_ID_RE.test(siteId)) {
      showAlert('Hub address must start with a letter and use lowercase letters, numbers, or hyphens only.', 'error');
      siteInput.focus();
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('Enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }

    setLoading(true);
    try {
      const slugOk = await checkSlug(siteId);
      if (!slugOk) {
        setLoading(false);
        return;
      }

      const turnstileToken = readChallengeToken();
      if (challengeRequired && !turnstileToken) {
        showAlert('Complete the “I am human” check to continue.', 'error');
        setLoading(false);
        return;
      }

      const response = await fetch(apiBase + '/api/public/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          siteId,
          customerEmail: email,
          plan,
          billingInterval: plan === 'plus' ? billingInterval : undefined,
          turnstileToken,
          referralCode: activeReferralCode || undefined
        })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showAlert(payload.message || payload.error || 'Signup failed. Try again or email support.', 'error');
        resetChallenge();
        setLoading(false);
        return;
      }

      const checkoutUrl = payload.checkoutUrl || payload.url;
      const successUrl = payload.successUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      if (successUrl) {
        window.location.href = successUrl;
        return;
      }

      showAlert('Signup could not be completed. Email support@lovely-home.co.uk for help.', 'error');
      setLoading(false);
    } catch (error) {
      showAlert('Network error — check your connection and try again.', 'error');
      setLoading(false);
    }
  });

  function updateSlugHint() {
    const siteId = siteInput.value.trim();
    if (!siteId) {
      slugHint.textContent = 'Example: smith → smith.lovely-hub.com';
      return;
    }
    slugHint.textContent = 'Your hub: ' + siteId + '.lovely-hub.com';
  }

  async function checkSlug(siteId) {
    try {
      const response = await fetch(apiBase + '/api/public/signup/slug/' + encodeURIComponent(siteId), {
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!payload.available) {
        showAlert(payload.message || 'That hub address is not available.', 'error');
        siteInput.focus();
        return false;
      }
      return true;
    } catch {
      showAlert('Could not check hub address availability. Try again.', 'error');
      return false;
    }
  }

  // Turnstile is optional: the widget only appears once the platform reports a
  // site key, so signup keeps working before the keys are configured.
  async function initChallenge() {
    if (!challengeSlot) return;
    try {
      const response = await fetch(apiBase + '/api/public/signup/status', {
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      const siteKey = (payload.turnstileSiteKey || '').trim();
      if (!siteKey) return;

      challengeRequired = true;
      const widget = document.createElement('div');
      widget.className = 'cf-turnstile';
      widget.dataset.sitekey = siteKey;
      widget.dataset.theme = 'light';
      challengeSlot.appendChild(widget);
      challengeSlot.hidden = false;

      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } catch {
      // Leave signup usable if the status check fails.
    }
  }

  function readChallengeToken() {
    const field = form.querySelector('[name="cf-turnstile-response"]');
    return field && field.value ? field.value : '';
  }

  function resetChallenge() {
    if (challengeRequired && window.turnstile && typeof window.turnstile.reset === 'function') {
      window.turnstile.reset();
    }
  }

  function showAlert(message, tone) {
    alertBox.textContent = message;
    alertBox.className = 'signup-alert signup-alert--' + (tone || 'error');
    alertBox.hidden = false;
  }

  function clearAlert() {
    alertBox.hidden = true;
    alertBox.textContent = '';
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    if (loading) {
      submitBtn.textContent = isPlusSignup() ? 'Starting checkout…' : 'Creating your home…';
      return;
    }
    submitBtn.textContent = isPlusSignup() ? 'Continue to secure checkout' : 'Create your free home';
  }

  form.querySelectorAll('input[name="signupPlan"]').forEach((input) => {
    input.addEventListener('change', updateSignupPlanUi);
  });

  updateSignupPlanUi();

  async function loadReferralPreview(code) {
    const banner = document.getElementById('signup-referral-banner');
    const benefitEl = document.getElementById('signup-referral-benefit');
    if (!banner || !benefitEl) return;
    try {
      const response = await fetch(apiBase + '/api/public/signup/referral/' + encodeURIComponent(code), {
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (!payload.valid) {
        activeReferralCode = '';
        activeReferralInterval = null;
        banner.hidden = true;
        benefitEl.textContent = '';
        setReferralBillingIntervalLock(null);
        if (referralCodeParam) {
          showAlert(payload.message || 'That referral link is not valid.', 'info');
        }
        return;
      }
      activeReferralCode = payload.code || code;
      activeReferralInterval = payload.billingInterval || null;
      banner.hidden = false;
      benefitEl.textContent =
        'Referral offer: ' + (payload.message || payload.refereeBenefit || 'discount applied at checkout.');
      setReferralBillingIntervalLock(
        activeReferralInterval === 'year' ? 'year' : activeReferralInterval === 'month' ? 'month' : null
      );
    } catch {
      // Signup API validates again on submit.
    }
  }

  async function loadIntroOfferBanner() {
    if (referralCodeParam) return;
    const banner = document.getElementById('signup-intro-banner');
    const benefitEl = document.getElementById('signup-intro-benefit');
    if (!banner || !benefitEl) return;
    try {
      const response = await fetch(apiBase + '/api/public/signup/pricing', {
        headers: { Accept: 'application/json' }
      });
      const pricing = await response.json().catch(() => ({}));
      if (window.LovelyHomePricing?.applyIntroOffer) {
        window.LovelyHomePricing.applyIntroOffer(pricing);
        return;
      }
      const intro = pricing.introOffer;
      if (!intro?.active) {
        banner.hidden = true;
        return;
      }
      const monthly = intro.monthlyBenefit ? String(intro.monthlyBenefit) : '';
      const yearly = intro.yearlyBenefit ? String(intro.yearlyBenefit) : '';
      benefitEl.textContent =
        'Introductory offer for new households: ' +
        (monthly && yearly ? monthly + ' (monthly) or ' + yearly + ' (yearly).' : monthly || yearly || 'discount at checkout.');
      banner.hidden = false;
    } catch {
      // Signup still works; server validates eligibility at checkout.
    }
  }

  updateSlugHint();
  initChallenge();
  if (referralCodeParam) loadReferralPreview(referralCodeParam);
  else loadIntroOfferBanner();

  document.addEventListener('DOMContentLoaded', function () {
    if (window.LovelyHomePricing) window.LovelyHomePricing.initPricing();
  });
})();
