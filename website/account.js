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
  let referralsEnabled = false;
  /** @type {Record<string, unknown> | null} */
  let marketingPricing = null;
  const SESSION_KEY = 'lovelyAccountSession';
  const BACKUP_PROMPT_KEY = 'lovelyAccountBackupPromptDismissed';
  const SESSION_EXPIRED_MESSAGE = 'You have been signed out. Enter your email for a new code.';
  const pageParams = new URLSearchParams(window.location.search);
  const pendingUpgradeSiteId = (pageParams.get('upgrade') || '').trim().toLowerCase();
  const pendingDowngradeSiteId = (pageParams.get('downgrade') || '').trim().toLowerCase();
  const FREE_GUIDES_EXPLAINER =
    'Two separate guide templates for your home (for example House Sitter Guide and Pet Care Guide). Each guide can hold unlimited topics — the limit is templates, not pages inside them.';

  restoreSession();
  initChallenge();
  loadAccountCapabilities();

  async function loadAccountCapabilities() {
    try {
      const response = await fetch(apiBase + '/api/public/account/status', {
        headers: { Accept: 'application/json' }
      });
      const payload = await response.json().catch(() => ({}));
      referralsEnabled = Boolean(payload.referralsEnabled);
    } catch {
      referralsEnabled = false;
    }
  }

  async function loadMarketingPricingCopy() {
    try {
      const response = await fetch(apiBase + '/api/public/signup/pricing', {
        headers: { Accept: 'application/json' }
      });
      if (response.ok) {
        marketingPricing = await response.json();
      }
    } catch {
      marketingPricing = null;
    }
  }

  /**
   * @param {'month' | 'year'} interval
   */
  function plusUpgradeRadioLabel(interval) {
    const monthly = marketingPricing?.monthly?.label;
    const yearly = marketingPricing?.yearly?.label;
    const prefix = interval === 'year' ? 'Yearly' : 'Monthly';
    if (interval === 'year' && yearly) return prefix + ' (' + yearly + ')';
    if (interval === 'month' && monthly) return prefix + ' (' + monthly + ')';
    return prefix;
  }

  function referralPlanRadioLabel(interval) {
    const referral =
      marketingPricing?.referral && typeof marketingPricing.referral === 'object'
        ? marketingPricing.referral
        : null;
    const prefix = interval === 'year' ? 'Yearly' : 'Monthly';
    if (!referral) {
      return interval === 'year' ? prefix + ' (£15 off)' : prefix + ' (£5 off × 2 months)';
    }
    const full = interval === 'year' ? referral.yearlyReferee : referral.monthlyReferee;
    const short = String(full || '')
      .split('(')[0]
      .trim();
    return prefix + ' (' + (short || full) + ')';
  }

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
      await loadAccountCapabilities();
      showHubs(payload.hubs || [], payload.sessionToken, payload.email);
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
      await loadAccountCapabilities();
      showHubs(payload.hubs || [], stored.sessionToken, payload.email);
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

  async function showHubs(hubs, sessionToken, signedInEmail) {
    await Promise.all([loadAccountCapabilities(), loadMarketingPricingCopy()]);
    emailForm.hidden = true;
    codeForm.hidden = true;
    hubsEl.hidden = false;
    if (title) title.textContent = 'Your hub';
    if (lead) {
      lead.textContent = hubs.length
        ? 'Billing changes open on Stripe. Referral links appear once your first invoice is paid.'
        : 'We could not find a hub for that email.';
    }
    const email = String(signedInEmail || readStoredSession()?.email || '').trim();
    if (!hubs.length) {
      renderSignedInShell(
        '<p class="signup-note muted">If you just signed up, wait a minute and try again. Otherwise email support@lovely-home.co.uk.</p>',
        sessionToken,
        email
      );
      return;
    }
    renderHubCards(hubs, sessionToken, email);
    if (pageParams.get('upgraded') === '1') {
      showAlert('Lovely Home+ is active — unlimited guide templates and scheduled stays.', 'info');
    } else if (pageParams.get('downgraded') === '1') {
      showAlert(
        'Your hub is on the Free plan again. Existing guides and stays stay as they are; you can add up to two guide templates and two scheduled stays going forward.',
        'info'
      );
    } else if (pageParams.get('closed') === '1') {
      showAlert(
        'Your hub is closing. We emailed confirmation — download a full backup from Settings if you have not already.',
        'info'
      );
    } else if (pageParams.get('upgrade_canceled') === '1') {
      showAlert('Checkout was canceled. You can upgrade anytime from here.', 'info');
    }
    if (pendingUpgradeSiteId) {
      const card = hubsEl.querySelector('[data-upgrade-site="' + pendingUpgradeSiteId + '"]');
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    if (pendingDowngradeSiteId) {
      const card = hubsEl.querySelector('[data-downgrade-site="' + pendingDowngradeSiteId + '"]');
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  /**
   * @param {string} bodyHtml
   * @param {string} sessionToken
   * @param {string} signedInEmail
   */
  function renderSignedInShell(bodyHtml, sessionToken, signedInEmail) {
    hubsEl.innerHTML =
      '<div class="account-signed-in">' +
      '<p class="account-signed-in__meta">Signed in as <strong>' +
      escapeHtml(signedInEmail || 'your account') +
      '</strong></p>' +
      '<button type="button" class="btn btn-secondary account-signed-in__sign-out" data-account-sign-out>Log out</button>' +
      '</div>' +
      bodyHtml;
    hubsEl.querySelector('[data-account-sign-out]')?.addEventListener('click', () => {
      signOut(sessionToken);
    });
  }

  async function signOut(sessionToken) {
    clearAlert();
    const button = hubsEl.querySelector('[data-account-sign-out]');
    setBusy(button, true);
    try {
      if (sessionToken) {
        await fetch(apiBase + '/api/public/account/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ sessionToken })
        });
      }
    } catch {
      // Local sign-out still proceeds if the network request fails.
    } finally {
      setBusy(button, false);
    }
    clearStoredSession();
    pendingEmail = '';
    showSignIn('You have been signed out.');
  }

  function renderHubCards(hubs, sessionToken, signedInEmail) {
    renderSignedInShell(hubs.map((hub) => renderHub(hub)).join(''), sessionToken, signedInEmail);
    hubsEl.querySelectorAll('[data-portal-site]').forEach((button) => {
      button.addEventListener('click', () => {
        const siteId = button.getAttribute('data-portal-site');
        if (!siteId) return;
        const hub = hubs.find((entry) => entry.siteId === siteId);
        openPortal(sessionToken, siteId, hub, button);
      });
    });
    hubsEl.querySelectorAll('[data-upgrade-checkout]').forEach((button) => {
      button.addEventListener('click', () => {
        const siteId = button.getAttribute('data-upgrade-checkout');
        if (!siteId) return;
        openUpgradeCheckout(sessionToken, siteId, button);
      });
    });
    hubsEl.querySelectorAll('[data-downgrade-free]').forEach((button) => {
      button.addEventListener('click', () => {
        const siteId = button.getAttribute('data-downgrade-free');
        if (!siteId) return;
        openDowngradeToFree(sessionToken, siteId, button);
      });
    });
    hubsEl.querySelectorAll('[data-close-hub]').forEach((button) => {
      button.addEventListener('click', () => {
        const siteId = button.getAttribute('data-close-hub');
        if (!siteId) return;
        const hub = hubs.find((entry) => entry.siteId === siteId);
        openCloseHub(sessionToken, siteId, hub, button);
      });
    });
    bindReferralActions(sessionToken);
  }

  function renderHub(hub) {
    const canceled = hub.status === 'canceled';
    const trial = formatTrial(hub.trialEnd);
    const status = statusCopy(hub);
    const downgradeBlock =
      hub.canDowngrade && !canceled
        ? '<div class="account-downgrade" data-downgrade-site="' +
          escapeHtml(hub.siteId) +
          '">' +
          '<p class="signup-note"><strong>Switch to Free plan</strong> — ' +
          escapeHtml(FREE_GUIDES_EXPLAINER) +
          ' Plus two scheduled stays. Your hub stays live; existing content is kept (soft limits — you cannot add more until you are under the cap or upgrade again).</p>' +
          '<button type="button" class="btn btn-primary btn-block" data-downgrade-free="' +
          escapeHtml(hub.siteId) +
          '">Switch to Free plan</button>' +
          '</div>'
        : '';
    const upgradeBlock =
      hub.canUpgrade && !canceled
        ? '<div class="account-upgrade" data-upgrade-site="' +
          escapeHtml(hub.siteId) +
          '">' +
          '<p class="signup-note"><strong>Upgrade to Lovely Home+</strong> — unlimited guide templates and scheduled stays. Card required at secure Stripe checkout.</p>' +
          '<div class="account-referral-plan">' +
          '<label><input type="radio" name="upgrade-plan-' +
          escapeHtml(hub.siteId) +
          '" value="month" checked> ' +
          escapeHtml(plusUpgradeRadioLabel('month')) +
          '</label>' +
          '<label><input type="radio" name="upgrade-plan-' +
          escapeHtml(hub.siteId) +
          '" value="year"> ' +
          escapeHtml(plusUpgradeRadioLabel('year')) +
          '</label>' +
          '</div>' +
          '<button type="button" class="btn btn-primary btn-block" data-upgrade-checkout="' +
          escapeHtml(hub.siteId) +
          '">Continue to secure checkout</button>' +
          '</div>'
        : '';
    const referralBlock =
      referralsEnabled && !canceled && hub.canManageBilling && hub.plan === 'plus'
        ? hub.canRefer
          ? '<div class="account-referral" data-referral-site="' +
            escapeHtml(hub.siteId) +
            '">' +
            '<p class="signup-note"><strong>Refer a friend</strong> — they get a discount on their first invoice(s); you get account credit when their first invoice is paid. You can generate multiple links.</p>' +
            '<div class="account-referral-plan">' +
            '<label><input type="radio" name="referral-plan-' +
            escapeHtml(hub.siteId) +
            '" value="month" checked> ' +
            escapeHtml(referralPlanRadioLabel('month')) +
            '</label>' +
            '<label><input type="radio" name="referral-plan-' +
            escapeHtml(hub.siteId) +
            '" value="year"> ' +
            escapeHtml(referralPlanRadioLabel('year')) +
            '</label>' +
            '</div>' +
            '<button type="button" class="btn btn-primary btn-block" data-referral-generate="' +
            escapeHtml(hub.siteId) +
            '">Generate referral link</button>' +
            '<div class="account-referral-result" hidden></div>' +
            '</div>'
          : '<div class="account-referral account-referral--locked">' +
            '<p class="signup-note muted"><strong>Refer a friend</strong> — unlocks after your first paid invoice.</p>' +
            '</div>'
        : '';
    const backupReminder =
      !canceled && hub.plan === 'plus'
        ? '<div class="account-backup-reminder" role="note">' +
          '<p class="account-backup-reminder__title"><strong>Before you cancel on Stripe</strong></p>' +
          '<p class="account-backup-reminder__body">Download a <strong>full backup</strong> from your hub while it is still live — it includes photos and appliance PDFs. Our platform archive on cancel is guide JSON only.</p>' +
          '<p class="account-backup-reminder__links">' +
          '<a href="' + escapeHtml(hub.hubUrl) + '"' + newTabAttrs() + '>Open hub</a>' +
          ' · <a href="/help#owner/backup-restore"' + newTabAttrs() + '>How to back up</a>' +
          '</p>' +
          '</div>'
        : '';
    const closeHubBlock =
      hub.canCloseHub && !canceled
        ? '<div class="account-close-hub" data-close-site="' +
          escapeHtml(hub.siteId) +
          '">' +
          '<p class="signup-note"><strong>Close hub permanently</strong> — takes the site down and archives guide JSON only. Download a full backup first if you want photos and appliance PDFs.</p>' +
          '<button type="button" class="btn btn-danger btn-block" data-close-hub="' +
          escapeHtml(hub.siteId) +
          '">Close hub permanently</button>' +
          '</div>'
        : '';
    const manage =
      hub.canManageBilling && !hub.canUpgrade
        ? '<button type="button" class="btn btn-secondary btn-block" data-portal-site="' +
          escapeHtml(hub.siteId) +
          '">' +
          (canceled ? 'View invoices on Stripe' : 'Invoices & card on Stripe') +
          '</button>'
        : hub.canManageBilling
          ? ''
          : '<p class="signup-note muted">Billing is not linked yet. Email support@lovely-home.co.uk.</p>';
    const openHub = canceled
      ? ''
      : '<a class="btn btn-primary btn-block" href="' + escapeHtml(hub.hubUrl) + '"' + newTabAttrs() + '>Open hub</a>';
    const body = canceled
      ? '<p>This subscription is cancelled, so Stripe has no live plan to change — only invoices and the saved card. Create a new home at lovely-home.co.uk/signup if you want the hub back.</p>'
      : hub.canUpgrade
        ? '<p>Your hub is on the Free plan — ' +
          escapeHtml(FREE_GUIDES_EXPLAINER) +
          ' Plus two scheduled stays. Upgrade to Lovely Home+ when you need more templates or stays. To <strong>close the hub entirely</strong>, use Close hub permanently below (after backing up).</p>'
        : hub.canDowngrade
          ? '<p>Your hub is on Lovely Home+. Switch to the Free plan below to stop Plus billing while keeping the hub live (soft limits apply). To <strong>close the hub entirely</strong>, use Invoices &amp; card on Stripe and cancel the subscription there — that archives the site after the billing period ends.</p>'
          : '<p>This is your private household hub. Guests sign in with Cloudflare email codes. Your card stays with Stripe — we never see the number.</p>' +
            '<p>Cancel anytime from Stripe; the hub stays up until the end of the current billing period, then we archive the house guide JSON and take the site down. Download a full backup from Settings before cancelling if you want photos and PDFs — our platform archive is guide JSON only.</p>';
    return (
      '<article class="account-hub-card">' +
        '<p class="account-hub-status' +
        (canceled ? ' account-hub-status--canceled' : '') +
        '">' +
        escapeHtml(status) +
        '</p>' +
        '<h3>' + escapeHtml(hub.siteId) + '.lovely-hub.com</h3>' +
        body +
        backupReminder +
        '<div class="account-hub-actions">' +
          openHub +
          manage +
        '</div>' +
        downgradeBlock +
        upgradeBlock +
        referralBlock +
        closeHubBlock +
      '</article>'
    );
  }

  function bindReferralActions(sessionToken) {
    hubsEl.querySelectorAll('[data-referral-generate]').forEach((button) => {
      button.addEventListener('click', () => {
        const siteId = button.getAttribute('data-referral-generate');
        if (!siteId) return;
        generateReferralLink(sessionToken, siteId, button);
      });
    });
  }

  async function generateReferralLink(sessionToken, siteId, button) {
    const container = hubsEl.querySelector('[data-referral-site="' + siteId + '"] .account-referral-result');
    const planInput = hubsEl.querySelector('input[name="referral-plan-' + siteId + '"]:checked');
    const billingInterval = planInput && planInput.value === 'year' ? 'year' : 'month';
    clearAlert();
    setBusy(button, true);
    try {
      const response = await fetch(apiBase + '/api/public/account/referral-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sessionToken, siteId, billingInterval })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        clearStoredSession();
        showSignIn(SESSION_EXPIRED_MESSAGE);
        return;
      }
      if (!response.ok || !payload.url) {
        showAlert(payload.message || 'Could not create a referral link.', 'error');
        return;
      }
      if (container) {
        container.hidden = false;
        container.innerHTML =
          '<p class="signup-note">' +
          escapeHtml(payload.refereeBenefit || 'Share this single-use link:') +
          '</p>' +
          '<input class="account-referral-url" type="text" readonly value="' +
          escapeHtml(payload.url) +
          '">' +
          '<button type="button" class="btn btn-secondary btn-block" data-copy-referral="' +
          escapeHtml(payload.url) +
          '">Copy link</button>';
        const copyBtn = container.querySelector('[data-copy-referral]');
        copyBtn?.addEventListener('click', () => copyReferralUrl(payload.url, copyBtn));
      }
    } catch {
      showAlert('Network error — check your connection and try again.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function copyReferralUrl(url, button) {
    try {
      await navigator.clipboard.writeText(url);
      if (button) {
        const original = button.textContent;
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = original;
        }, 2000);
      }
    } catch {
      showAlert('Could not copy automatically — select the link and copy it manually.', 'info');
    }
  }

  /**
   * @param {{ siteId: string, hubUrl?: string, status?: string } | undefined} hub
   */
  /**
   * @param {{ siteId: string, hubUrl?: string } | undefined} hub
   */
  async function openCloseHub(sessionToken, siteId, hub, button) {
    clearAlert();
    const confirmed = await confirmCloseHub(hub);
    if (!confirmed) return;
    setBusy(button, true);
    try {
      const response = await fetch(apiBase + '/api/public/account/close-hub', {
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
      if (!response.ok) {
        showAlert(payload.message || 'Could not close the hub. Email support@lovely-home.co.uk.', 'error');
        return;
      }
      window.location.href = '/account?closed=1&site=' + encodeURIComponent(siteId);
    } catch {
      showAlert('Network error — check your connection and try again.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function openDowngradeToFree(sessionToken, siteId, button) {
    clearAlert();
    const confirmed = await confirmDowngradeToFree();
    if (!confirmed) return;
    setBusy(button, true);
    try {
      const response = await fetch(apiBase + '/api/public/account/downgrade-to-free', {
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
      if (!response.ok) {
        showAlert(payload.message || 'Could not switch to the Free plan. Email support@lovely-home.co.uk.', 'error');
        return;
      }
      window.location.href = '/account?downgraded=1&site=' + encodeURIComponent(siteId);
    } catch {
      showAlert('Network error — check your connection and try again.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function openUpgradeCheckout(sessionToken, siteId, button) {
    clearAlert();
    setBusy(button, true);
    try {
      const planInput = hubsEl.querySelector('input[name="upgrade-plan-' + siteId + '"]:checked');
      const billingInterval = planInput && planInput.value === 'year' ? 'year' : 'month';
      const response = await fetch(apiBase + '/api/public/account/upgrade-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ sessionToken, siteId, billingInterval })
      });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        clearStoredSession();
        showSignIn(SESSION_EXPIRED_MESSAGE);
        return;
      }
      if (!response.ok || !payload.checkoutUrl) {
        showAlert(payload.message || 'Could not start upgrade checkout. Email support@lovely-home.co.uk.', 'error');
        return;
      }
      window.location.href = payload.checkoutUrl;
    } catch {
      showAlert('Network error — check your connection and try again.', 'error');
    } finally {
      setBusy(button, false);
    }
  }

  async function openPortal(sessionToken, siteId, hub, button) {
    clearAlert();
    if (hub && hub.status !== 'canceled' && !readBackupPromptDismissed()) {
      const proceed = await confirmBeforeStripe(hub);
      if (!proceed) return;
    }
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

  function statusCopy(hub) {
    const status = hub.status;
    const trial = formatTrial(hub.trialEnd);
    if (hub.plan === 'free' && status === 'active') return 'Free plan';
    if (status === 'trialing') return trial ? 'Legacy trial — first charge ' + trial : 'Legacy trial';
    if (status === 'active') return 'Lovely Home+';
    if (status === 'past_due') return 'Payment failed — update the card on Stripe';
    if (status === 'canceled') return 'Cancelled — this hub has ended';
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
      referralsEnabled = Boolean(payload.referralsEnabled);
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

  function newTabAttrs() {
    return ' target="_blank" rel="noopener noreferrer"';
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function readBackupPromptDismissed() {
    try {
      return localStorage.getItem(BACKUP_PROMPT_KEY) === '1';
    } catch {
      return false;
    }
  }

  function writeBackupPromptDismissed() {
    try {
      localStorage.setItem(BACKUP_PROMPT_KEY, '1');
    } catch {
      // Ignore storage failures.
    }
  }

  /**
   * @param {{
   *   title: string;
   *   bodyHtml: string;
   *   cancelLabel?: string;
   *   confirmLabel: string;
   *   confirmClass?: string;
   *   onConfirm?: () => void;
   * }} options
   */
  function openAccountDialog(options) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'account-backup-dialog';
      overlay.setAttribute('role', 'presentation');

      const dialog = document.createElement('div');
      dialog.className = 'account-backup-dialog__panel';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      const titleId = 'account-dialog-title-' + String(Date.now());
      dialog.setAttribute('aria-labelledby', titleId);

      dialog.innerHTML =
        '<h2 id="' +
        titleId +
        '" class="account-backup-dialog__title">' +
        escapeHtml(options.title) +
        '</h2>' +
        options.bodyHtml +
        '<div class="account-backup-dialog__actions">' +
        '<button type="button" class="btn btn-secondary" data-account-dialog="cancel">' +
        escapeHtml(options.cancelLabel || 'Not now') +
        '</button>' +
        '<button type="button" class="btn ' +
        escapeHtml(options.confirmClass || 'btn-primary') +
        '" data-account-dialog="confirm">' +
        escapeHtml(options.confirmLabel) +
        '</button>' +
        '</div>';

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      function close(result) {
        overlay.remove();
        previouslyFocused?.focus();
        resolve(Boolean(result));
      }

      overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close(false);
      });
      dialog.querySelector('[data-account-dialog="cancel"]')?.addEventListener('click', () => close(false));
      dialog.querySelector('[data-account-dialog="confirm"]')?.addEventListener('click', () => {
        options.onConfirm?.();
        close(true);
      });
      document.addEventListener(
        'keydown',
        function onKeydown(event) {
          if (event.key === 'Escape') {
            document.removeEventListener('keydown', onKeydown);
            close(false);
          }
        },
        { once: true }
      );

      dialog.querySelector('[data-account-dialog="confirm"]')?.focus();
    });
  }

  /**
   * @param {{ hubUrl?: string } | undefined} hub
   */
  function confirmCloseHub(hub) {
    const hubUrl = String(hub?.hubUrl || '').trim();
    return openAccountDialog({
      title: 'Close hub permanently?',
      bodyHtml:
        '<p>This takes down your live hub and archives guide JSON only — photos and appliance PDFs are not kept on our platform.</p>' +
        '<p><strong>Download a full backup first</strong> from Settings if you want to keep everything.</p>' +
        '<p class="account-backup-dialog__links">' +
        (hubUrl ? '<a href="' + escapeHtml(hubUrl) + '"' + newTabAttrs() + '>Open hub → Settings → Utilities</a> · ' : '') +
        '<a href="/help#owner/backup-restore"' + newTabAttrs() + '>How to back up</a>' +
        '</p>' +
        '<p>This cannot be undone from your account — you would need to sign up again for a new hub.</p>',
      cancelLabel: 'Keep hub',
      confirmLabel: 'Close hub permanently',
      confirmClass: 'btn-danger'
    });
  }

  function confirmDowngradeToFree() {
    return openAccountDialog({
      title: 'Switch to the Free plan?',
      bodyHtml:
        '<p>' +
        escapeHtml(FREE_GUIDES_EXPLAINER) +
        '</p>' +
        '<p>Plus two scheduled stays. Your hub stays live. Existing guides and stays are kept; you cannot add more until you are under the Free limits or upgrade again.</p>' +
        '<p><strong>Plus billing stops immediately</strong> (no partial-month refund). Refer a friend returns when you upgrade to Lovely Home+ again.</p>',
      cancelLabel: 'Keep Lovely Home+',
      confirmLabel: 'Switch to Free'
    });
  }

  /**
   * Stripe Customer Portal cannot show a custom message before cancellation — only
   * after (via deep links) or on our site before redirecting.
   *
   * @param {{ hubUrl?: string }} hub
   */
  function confirmBeforeStripe(hub) {
    const hubUrl = String(hub.hubUrl || '').trim();
    return openAccountDialog({
      title: 'Opening Stripe billing',
      bodyHtml:
        '<p>Stripe handles card updates and cancellation. Stripe does not let us show a backup reminder inside their portal.</p>' +
        '<p><strong>Planning to cancel?</strong> Download a full backup from your hub first — it includes photos and appliance PDFs.</p>' +
        '<p class="account-backup-dialog__links">' +
        (hubUrl ? '<a href="' + escapeHtml(hubUrl) + '"' + newTabAttrs() + '>Open hub → Settings → Utilities</a> · ' : '') +
        '<a href="/help#owner/backup-restore"' + newTabAttrs() + '>How to back up</a>' +
        '</p>' +
        '<label class="account-backup-dialog__skip">' +
        '<input type="checkbox" id="account-backup-dialog-skip"> Don\u2019t show this again' +
        '</label>',
      cancelLabel: 'Not now',
      confirmLabel: 'Continue to Stripe',
      onConfirm: () => {
        const skip = document.querySelector('#account-backup-dialog-skip');
        if (skip instanceof HTMLInputElement && skip.checked) {
          writeBackupPromptDismissed();
        }
      }
    });
  }
})();
