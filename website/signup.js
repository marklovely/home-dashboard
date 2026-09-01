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

  if (!form || !siteInput || !emailInput || !submitBtn) return;

  let challengeRequired = false;

  const params = new URLSearchParams(window.location.search);
  const planParam = (params.get('plan') || '').trim().toLowerCase();
  if (planParam === 'year') {
    const yearRadio = form.querySelector('input[name="billingInterval"][value="year"]');
    if (yearRadio) yearRadio.checked = true;
  }

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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    const siteId = siteInput.value.trim().toLowerCase();
    const email = emailInput.value.trim().toLowerCase();
    const billingInterval =
      form.querySelector('input[name="billingInterval"]:checked')?.value === 'year' ? 'year' : 'month';

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
        body: JSON.stringify({ siteId, customerEmail: email, billingInterval, turnstileToken })
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showAlert(payload.message || payload.error || 'Signup failed. Try again or email support.', 'error');
        resetChallenge();
        setLoading(false);
        return;
      }

      const checkoutUrl = payload.checkoutUrl || payload.url;
      if (!checkoutUrl) {
        showAlert('Checkout could not be started. Email support@lovely-home.co.uk for help.', 'error');
        setLoading(false);
        return;
      }

      window.location.href = checkoutUrl;
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
    submitBtn.textContent = loading ? 'Starting checkout…' : 'Continue to secure checkout';
  }

  updateSlugHint();
  initChallenge();

  document.addEventListener('DOMContentLoaded', function () {
    if (window.LovelyHomePricing) window.LovelyHomePricing.initPricing();
  });
})();
