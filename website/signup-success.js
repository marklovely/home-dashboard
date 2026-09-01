/**
 * Live hub provisioning status for the trial success page.
 *
 * A hub takes roughly ten minutes to build, so the page polls the platform
 * instead of asking buyers to keep retrying the URL. The address stays as
 * text until the hub SPA is live; the Open button and QR code appear then.
 * A recorded setup failure stops the spinner immediately. After 30 minutes
 * without a live hub, the page asks for support instead of showing a QR.
 */
(function () {
  const SITE_ID_RE = /^[a-z][a-z0-9_-]{0,31}$/;
  const FAST_POLL_MS = 6000;
  const SLOW_POLL_MS = 15000;
  const FAST_POLL_WINDOW_MS = 3 * 60 * 1000;
  const GIVE_UP_MS = 30 * 60 * 1000;
  const MAX_CONSECUTIVE_ERRORS = 3;

  const apiBase = (
    document.querySelector('meta[name="lovely-platform-api"]')?.content || 'https://platform.lovely-home.co.uk'
  ).replace(/\/$/, '');

  const params = new URLSearchParams(window.location.search);
  const siteId = (params.get('site') || '').trim().toLowerCase();

  const hubBlock = document.getElementById('success-hub');
  const hubLink = document.getElementById('hub-link');
  const openBtn = document.getElementById('open-hub-btn');
  const lead = document.getElementById('success-lead');
  const heading = document.getElementById('success-heading');
  const progress = document.getElementById('hub-progress');
  const progressTitle = document.getElementById('hub-progress-title');
  const progressNote = document.getElementById('hub-progress-note');
  const qrFigure = document.getElementById('hub-qr');
  const qrHost = document.getElementById('hub-qr-code');
  const retryBtn = document.getElementById('retry-signup-btn');
  const successSteps = document.getElementById('success-steps');

  if (!siteId || !SITE_ID_RE.test(siteId) || !progress) return;

  const hostname = siteId + '.lovely-hub.com';
  const hubUrl = 'https://' + hostname + '/';
  const startedAt = Date.now();

  let timer = null;
  let giveUpTimer = null;
  let consecutiveErrors = 0;
  let settled = false;

  hubLink.textContent = hostname;
  hubLink.removeAttribute('href');
  openBtn.href = hubUrl;
  hubBlock.hidden = false;
  progress.hidden = false;
  lead.textContent =
    'Your 7-day trial is active for ' +
    hostname +
    '. Building a hub takes about 10 minutes — leave this page open and it will tell you the moment yours is live.';

  void poll();
  giveUpTimer = setTimeout(() => {
    if (!settled) showSlow();
  }, GIVE_UP_MS);

  document.addEventListener('visibilitychange', () => {
    if (!settled && document.visibilityState === 'visible') {
      void poll();
    }
  });

  async function poll() {
    if (settled) return;
    clearTimeout(timer);

    try {
      const response = await fetch(apiBase + '/api/public/hub-status/' + encodeURIComponent(siteId), {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error('status ' + response.status);
      }

      const payload = await response.json();
      consecutiveErrors = 0;

      if (payload.ready) {
        showReady();
        return;
      }

      if (payload.state === 'failed') {
        showFailed(payload);
        return;
      }

      showProvisioning();
    } catch {
      consecutiveErrors += 1;
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        showUnknown();
        return;
      }
    }

    if (Date.now() - startedAt > GIVE_UP_MS) {
      showSlow();
      return;
    }

    const wait = Date.now() - startedAt < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS;
    timer = setTimeout(poll, wait);
  }

  function stopPolling() {
    settled = true;
    clearTimeout(timer);
    clearTimeout(giveUpTimer);
  }

  function showProvisioning() {
    progress.dataset.state = 'provisioning';
    setTitle('Deploying your hub now', true);
    progressNote.textContent =
      'Usually ready about 10 minutes after checkout' +
      elapsedSuffix() +
      '. This page checks every few seconds — no need to refresh or retry.';
  }

  function showReady() {
    stopPolling();
    progress.dataset.state = 'ready';
    heading.textContent = 'Your hub is ready';
    lead.textContent =
      'Your 7-day trial is active for ' + hostname + '. Your hub finished building — use the trial to set it up before your sitter arrives.';
    setTitle('Your hub is live', false);
    progressNote.textContent = 'Open it below and run the setup wizard — or scan the code on the device you want to use.';
    hubLink.href = hubUrl;
    openBtn.hidden = false;
    hideRetry();
    if (successSteps) successSteps.hidden = false;
    void renderQr();
  }

  function showFailed(payload) {
    stopPolling();
    progress.dataset.state = 'failed';
    const invalidName = payload?.failureKind === 'invalid_hostname' || siteId.includes('_');
    heading.textContent = invalidName ? 'We could not create this hub' : 'We could not finish your hub';
    lead.textContent = invalidName
      ? 'Your card was not charged, but this hub address cannot be used. Pick a name with letters, numbers, or hyphens — no underscores.'
      : 'Your 7-day trial started, but we could not finish building this hub. You have not been charged. Email support@lovely-home.co.uk with this address and we will complete it.';
    setTitle(invalidName ? 'Hub address cannot be used' : 'Hub setup did not finish', false);
    progressNote.textContent =
      (payload?.message || 'We could not finish building your hub.') +
      ' You can try a different address below, then cancel this trial from the Stripe email if you still have one.';
    hubLink.removeAttribute('href');
    openBtn.hidden = true;
    showRetry();
    if (successSteps) successSteps.hidden = true;
  }

  function showSlow() {
    stopPolling();
    progress.dataset.state = 'slow';
    heading.textContent = 'This is taking longer than usual';
    lead.textContent =
      'Your 7-day trial is active for ' +
      hostname +
      ', but this page could not confirm the hub is live. Email support@lovely-home.co.uk with this address and we will finish it.';
    setTitle('We could not confirm your hub is live', false);
    progressNote.textContent =
      'Do not keep waiting here. Send us the hub address above and we will complete the setup. You have not been charged.';
    hubLink.removeAttribute('href');
    openBtn.hidden = true;
    showRetry();
  }

  function showUnknown() {
    stopPolling();
    progress.dataset.state = 'unknown';
    setTitle('Your hub is being built', false);
    progressNote.textContent =
      'We cannot check the build status from here right now. Your hub is usually ready about 10 minutes after checkout — try the link below then.';
    hubLink.href = hubUrl;
    openBtn.hidden = false;
    void renderQr();
  }

  function setTitle(text, busy) {
    progressTitle.innerHTML = '';
    if (busy) {
      const spinner = document.createElement('span');
      spinner.className = 'hub-progress-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      progressTitle.append(spinner);
    }
    progressTitle.append(document.createTextNode(text));
  }

  function showRetry() {
    if (retryBtn) retryBtn.hidden = false;
  }

  function hideRetry() {
    if (retryBtn) retryBtn.hidden = true;
  }

  function elapsedSuffix() {
    const minutes = Math.floor((Date.now() - startedAt) / 60000);
    if (minutes < 1) return '';
    return ' — ' + minutes + (minutes === 1 ? ' minute' : ' minutes') + ' so far';
  }

  async function renderQr() {
    if (!qrFigure || !qrHost || qrHost.childElementCount > 0) return;
    const qr = window.LovelyHomeQr;
    if (!qr || typeof qr.toSvgWithBadge !== 'function') return;

    try {
      qrHost.innerHTML = await qr.toSvgWithBadge(hubUrl, { logoHref: 'favicon.png' });
      const svg = qrHost.querySelector('svg');
      if (svg) {
        svg.setAttribute('role', 'img');
        svg.setAttribute('aria-label', 'QR code to open ' + hostname);
      }
      qrFigure.hidden = false;
    } catch {
      qrFigure.hidden = true;
    }
  }
})();
