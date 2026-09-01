(function () {
  const apiBase = (document.querySelector('meta[name="lovely-platform-api"]')?.content || 'https://platform.lovely-home.co.uk').replace(/\/$/, '');
  const form = document.getElementById('contact-form');
  const submitBtn = document.getElementById('contact-submit');
  const alertBox = document.getElementById('contact-alert');
  const fallback = document.getElementById('contact-mailto-fallback');
  const challengeSlot = document.getElementById('contact-challenge');

  if (!form || !submitBtn) return;

  let challengeRequired = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearAlert();

    const name = String(form.name.value || '').trim();
    const email = String(form.email.value || '').trim().toLowerCase();
    const hub = String(form.hub.value || '').trim();
    const subject = String(form.subject.value || '').trim();
    const message = String(form.message.value || '').trim();
    const website = String(form.website.value || '').trim();

    if (!name) {
      showAlert('Enter your name.', 'error');
      form.name.focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showAlert('Enter a valid email address.', 'error');
      form.email.focus();
      return;
    }
    if (!subject) {
      showAlert('Enter a subject.', 'error');
      form.subject.focus();
      return;
    }
    if (message.length < 10) {
      showAlert('Enter a short message so we know how to help.', 'error');
      form.message.focus();
      return;
    }

    const turnstileToken = readChallengeToken();
    if (challengeRequired && !turnstileToken) {
      showAlert('Complete the “I am human” check to continue.', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiBase + '/api/public/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ name, email, hub, subject, message, website, turnstileToken })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showAlert(payload.message || 'Could not send just now. Email support@lovely-home.co.uk instead.', 'error');
        resetChallenge();
        setLoading(false);
        return;
      }
      form.reset();
      resetChallenge();
      showAlert(payload.message || 'Thanks — we will reply to the email you entered.', 'info');
    } catch {
      showAlert('Network error — check your connection, or email support@lovely-home.co.uk.', 'error');
    }
    setLoading(false);
  });

  async function initChallenge() {
    try {
      const response = await fetch(apiBase + '/api/public/contact/status', {
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      if (payload.enabled === false) {
        form.hidden = true;
        if (fallback) fallback.hidden = false;
        return;
      }

      const siteKey = (payload.turnstileSiteKey || '').trim();
      if (!siteKey || !challengeSlot) return;

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
      /* Form still works; Turnstile is optional until keys exist. */
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
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = 'signup-alert signup-alert--' + (tone || 'error');
    alertBox.hidden = false;
  }

  function clearAlert() {
    if (!alertBox) return;
    alertBox.hidden = true;
    alertBox.textContent = '';
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading ? 'Sending…' : 'Send message';
  }

  initChallenge();
})();
