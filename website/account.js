(function () {
  const apiBase = (document.querySelector('meta[name="lovely-platform-api"]')?.content || 'https://platform.lovely-home.co.uk').replace(/\/$/, '');

  const emailForm = document.getElementById('account-email-form');
  const codeForm = document.getElementById('account-code-form');
  const hubsEl = document.getElementById('account-hubs');
  const emailInput = document.getElementById('account-email');
  const codeInput = document.getElementById('account-code');
  const emailSubmit = document.getElementById('account-email-submit');
  const codeSubmit = document.getElementById('account-code-submit');
  const backBtn = document.getElementById('account-code-back');
  const alertBox = document.getElementById('account-alert');
  const lead = document.getElementById('account-lead');
  const challengeSlot = document.getElementById('account-challenge');
  const title = document.getElementById('account-form-title');

  if (!emailForm || !codeForm || !hubsEl || !emailInput || !codeInput) return;

  let challengeRequired = false;
  let pendingEmail = '';
  const SESSION_KEY = 'lovelyAccountSession';
  const SESSION_EXPIRED_MESSAGE = 'You have been signed out. Enter your email for a new code.';

  restoreSession();
  initChallenge();

  emailForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();
    const email = emailInput.value.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('Enter a valid email address.', 'error');
      emailInput.focus();
      return;
    }
    const turnstileToken = readChallengeToken();
    if (challengeRequired && !turnstileToken) {
      showAlert('Complete the “I am human” check to continue.', 'error');
      return;
    }
    setBusy(emailSubmit, true);
    try {
      const response = await fetch(apiBase + '/api/public/account/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, turnstileToken })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showAlert(payload.message || 'Could not send a code. Try again.', 'error');
        resetChallenge();
        return;
      }
      pendingEmail = email;
      emailForm.hidden = true;
      codeForm.hidden = false;
      if (title) title.textContent = 'Enter the code';
      if (lead) lead.textContent = payload.message || 'If that email has a hub, we sent a six-digit code.';
      codeInput.value = '';
      codeInput.focus();
    } catch {
      showAlert('Network error — check your connection and try again.', 'error');
    } finally {
      setBusy(emailSubmit, false);
    }
  });

  codeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();
    const code = codeInput.value.replace(/\s+/g, '');
    if (!/^\d{6}$/.test(code)) {
      showAlert('Enter the six-digit code from your email.', 'error');
      codeInput.focus();
      return;
    }
    setBusy(codeSubmit, true);
    try {
      const response = await fetch(apiBase + '/api/public/account/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: pendingEmail, code })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showAlert(payload.message || 'That code did not work. Try again.', 'error');
        return;
      }
      writeStoredSession({
        sessionToken: payload.sessionToken,
        email: payload.email,
        expiresAt: payload.expiresAt
      });
      showHubs(payload.hubs || [], payload.sessionToken);
    } catch {
      showAlert('Network error — check your connection and try again.', 'error');
    } finally {
      setBusy(codeSubmit, false);
    }
  });

  backBtn?.addEventListener('click', () => {
    pendingEmail = '';
    showSignIn();
    resetChallenge();
  });

  async function restoreSession() {
    const stored = readStoredSession();
    if (stored && stored.expired) {
      showSignIn(SESSION_EXPIRED_MESSAGE);
      return;
    }
    if (!stored || !stored.sessionToken) return;
    try {
      const response = await fetch(apiBase + '/api/public/account/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sessionToken: stored.sessionToken })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        clearStoredSession();
        showSignIn(payload.message || SESSION_EXPIRED_MESSAGE);
        return;
      }
      writeStoredSession({
        sessionToken: stored.sessionToken,
        email: payload.email,
        expiresAt: payload.expiresAt
      });
      showHubs(payload.hubs || [], stored.sessionToken);
    } catch {
      // Leave the sign-in form if the restore request fails.
    }
  }

  function readStoredSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.sessionToken) return null;
      if (Number(parsed.expiresAt) > 0 && Number(parsed.expiresAt) <= Date.now()) {
        clearStoredSession();
        return { expired: true };
      }
      return parsed;
    } catch {
      return null;
    }
  }

  function writeStoredSession(session) {
    sessionStorage.removeItem(SESSION_KEY);
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  function clearStoredSession() {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }

  function showSignIn(message) {
    emailForm.hidden = false;
    codeForm.hidden = true;
    hubsEl.hidden = true;
    hubsEl.innerHTML = '';
    if (title) title.textContent = 'Sign in';
    if (lead) lead.textContent = 'Enter the email from signup. If we have a hub for it, we email a six-digit code.';
    if (message) showAlert(message, 'info');
    else clearAlert();
  }

  function showHubs(hubs, sessionToken) {
    emailForm.hidden = true;
    codeForm.hidden = true;
    hubsEl.hidden = false;
    if (title) title.textContent = 'Your hub';
    if (lead) {
      lead.textContent = hubs.length
        ? 'Billing changes open on Stripe. You stay signed in when you come back.'
        : 'We could not find a hub for that email.';
    }
    if (!hubs.length) {
      hubsEl.innerHTML = '<p class="signup-note muted">If you just signed up, wait a minute and try again. Otherwise email support@lovely-home.co.uk.</p>';
      return;
    }
    hubsEl.innerHTML = hubs.map((hub) => renderHub(hub)).join('');
    hubsEl.querySelectorAll('[data-portal-site]').forEach((button) => {
      button.addEventListener('click', () => openPortal(sessionToken, button.getAttribute('data-portal-site'), button));
    });
  }

  function renderHub(hub) {
    const trial = formatTrial(hub.trialEnd);
    const status = statusCopy(hub.status, trial);
    const manage = hub.canManageBilling
      ? '<button type="button" class="btn btn-primary btn-block" data-portal-site="' + escapeHtml(hub.siteId) + '">Manage billing on Stripe</button>'
      : '<p class="signup-note muted">Billing is not linked yet. Email support@lovely-home.co.uk.</p>';
    return (
      '<article class="account-hub-card">' +
        '<p class="account-hub-status">' + escapeHtml(status) + '</p>' +
        '<h3>' + escapeHtml(hub.siteId) + '.lovely-hub.com</h3>' +
        '<p>This is your private household hub. Sitters sign in with Cloudflare email codes. Your card stays with Stripe — we never see the number.</p>' +
        '<p>Cancel before the trial ends and you pay nothing. After a paid period, cancel anytime; the hub stays up until that period ends, then we archive the house guide JSON and take the site down. Photos and appliance PDFs are not in the archive.</p>' +
        '<div class="account-hub-actions">' +
          '<a class="btn btn-secondary btn-block" href="' + escapeHtml(hub.hubUrl) + '">Open hub</a>' +
          manage +
        '</div>' +
      '</article>'
    );
  }

  async function openPortal(sessionToken, siteId, button) {
    clearAlert();
    setBusy(button, true);
    try {
      const response = await fetch(apiBase + '/api/public/account/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sessionToken, siteId })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        clearStoredSession();
        showSignIn(SESSION_EXPIRED_MESSAGE);
        return;
      }
      if (!response.ok || !payload.url) {
        showAlert(payload.message || 'Could not open Stripe billing. Email support@lovely-home.co.uk.', 'error');
        return;
      }
      window.location.href = payload.url;
    } catch {
      showAlert('Network error — check your connection and try again.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  function statusCopy(status, trial) {
    if (status === 'trialing') return trial ? 'Trial — first charge ' + trial : 'Trial — you are not charged today';
    if (status === 'active') return 'Paid subscription';
    if (status === 'past_due') return 'Payment failed — update the card on Stripe';
    if (status === 'canceled') return 'Ended — the live hub is being taken down';
    return 'Hub status: ' + status;
  }

  function formatTrial(ms) {
    const n = Number(ms);
    if (!Number.isFinite(n) || n <= 0) return '';
    try {
      return new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/London' }).format(new Date(n));
    } catch {
      return '';
    }
  }

  async function initChallenge() {
    if (!challengeSlot) return;
    try {
      const response = await fetch(apiBase + '/api/public/account/status', {
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
      // Account stays usable if the status check fails.
    }
  }

  function readChallengeToken() {
    const field = emailForm.querySelector('[name="cf-turnstile-response"]');
    return field && field.value ? field.value : '';
  }

  function resetChallenge() {
    if (challengeRequired && window.turnstile && typeof window.turnstile.reset === 'function') {
      window.turnstile.reset();
    }
  }

  function showAlert(message, tone) {
    if (!alertBox) return;
    alertBox.hidden = false;
    alertBox.className = 'signup-alert signup-alert--' + (tone || 'info');
    alertBox.textContent = message;
  }

  function clearAlert() {
    if (!alertBox) return;
    alertBox.hidden = true;
    alertBox.textContent = '';
  }

  function setBusy(button, busy) {
    if (!button) return;
    button.disabled = Boolean(busy);
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
})();
