import { setStripeMode } from './api.js';
import { panelFoldOpenAttr, wirePanelFold } from './panelFold.js';

const STRIPE_FOLD_ID = 'stripe-mode-fold';

/**
 * @param {Record<string, unknown> | null | undefined} stripe
 * @param {boolean} billingDbConfigured
 */
export function renderStripeModePanel(stripe, billingDbConfigured) {
  if (!billingDbConfigured) {
    return `
      <section class="panel stripe-mode" id="stripe-mode">
        <details class="panel-fold" id="${STRIPE_FOLD_ID}"${panelFoldOpenAttr(STRIPE_FOLD_ID)}>
          <summary class="panel-fold-summary">Stripe</summary>
          <div class="panel-fold-body">
            <p class="muted">Bind <code>PLATFORM_BILLING_DB</code> and apply billing migrations, including <code>0007_platform_settings.sql</code>.</p>
          </div>
        </details>
      </section>
    `;
  }

  const mode = stripe?.mode === 'live' ? 'live' : 'test';
  const configured = stripe?.stripeBillingConfigured === true;
  const liveConfigured = stripe?.liveConfigured === true;
  const testConfigured = stripe?.testConfigured === true;
  const openSubscriptions = Number(stripe?.openSubscriptions ?? 0);
  const keyPrefix = String(stripe?.keyPrefix ?? '');
  const badgeClass = mode === 'live' ? 'badge-bad' : 'badge-ok';
  const badgeLabel = mode === 'live' ? 'Live mode' : 'Test mode';

  let banner = '';
  if (!configured) {
    banner =
      mode === 'live'
        ? '<div class="banner banner-warn">Live mode is on, but live Stripe keys or prices are missing on the Pages project.</div>'
        : '<div class="banner banner-warn">Stripe billing needs test <code>STRIPE_SECRET_KEY</code>, <code>STRIPE_WEBHOOK_SECRET</code>, and at least one of <code>STRIPE_PRICE_ID</code> / <code>STRIPE_PRICE_ID_YEARLY</code>.</div>';
  }

  const nextButton =
    mode === 'live'
      ? '<button type="button" class="btn btn-small" data-stripe-mode-open="test">Switch to test mode…</button>'
      : `<button type="button" class="btn btn-small" data-stripe-mode-open="live"${liveConfigured ? '' : ' disabled'}>Go live…</button>`;

  return `
    <section class="panel stripe-mode" id="stripe-mode">
      <details class="panel-fold" id="${STRIPE_FOLD_ID}"${panelFoldOpenAttr(STRIPE_FOLD_ID)}>
        <summary class="panel-fold-summary">Stripe <span class="badge ${badgeClass}">${escapeHtml(badgeLabel)}</span></summary>
        <div class="panel-fold-body">
          ${banner}
          <p class="muted">Checkout, webhooks, marketing prices, and the customer portal use this mode. Terraform keeps both key sets; this switch is stored in D1 so an apply cannot silently revert it.</p>
          <ul class="stripe-mode-facts">
            <li>Active key prefix: <code>${escapeHtml(keyPrefix || '—')}</code></li>
            <li>Test keys: ${testConfigured ? 'configured' : 'missing'}</li>
            <li>Live keys: ${liveConfigured ? 'configured' : 'missing'}</li>
            <li>Open subscriptions in D1: <strong>${openSubscriptions}</strong></li>
          </ul>
          ${!liveConfigured && mode === 'test' ? '<p class="muted">Add live keys in hub.tfvars / GitHub secrets, then terraform apply, before going live.</p>' : ''}
          <div class="stripe-mode-actions">${nextButton}</div>
        </div>
      </details>
    </section>
  `;
}

/**
 * @param {(error: unknown) => void} onError
 * @param {() => Promise<void>} reload
 * @param {Record<string, unknown> | null | undefined} stripe
 */
export function wireStripeModePanel(onError, reload, stripe) {
  wirePanelFold(STRIPE_FOLD_ID);
  document.querySelectorAll('[data-stripe-mode-open]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextMode = button.getAttribute('data-stripe-mode-open') === 'live' ? 'live' : 'test';
      openStripeModeConfirm({ nextMode, stripe, onError, reload });
    });
  });
}

/**
 * @param {{
 *   nextMode: 'test' | 'live',
 *   stripe: Record<string, unknown> | null | undefined,
 *   onError: (error: unknown) => void,
 *   reload: () => Promise<void>
 * }} options
 */
function openStripeModeConfirm(options) {
  const { nextMode, stripe, onError, reload } = options;
  const goingLive = nextMode === 'live';
  const confirmation = goingLive ? 'GO LIVE' : 'USE TEST';
  const openSubscriptions = Number(stripe?.openSubscriptions ?? 0);

  const overlay = document.createElement('div');
  overlay.className = 'wizard-overlay';
  overlay.innerHTML = `
    <div class="wizard-panel" role="dialog" aria-modal="true" aria-labelledby="stripe-mode-title">
      <div class="wizard-head">
        <h2 id="stripe-mode-title">${goingLive ? 'Go live on Stripe' : 'Switch Stripe to test mode'}</h2>
        <button type="button" class="wizard-close" data-stripe-mode-cancel aria-label="Close">&times;</button>
      </div>
      <div class="wizard-body">
        <ul>
          ${
            goingLive
              ? `<li>Marketing signup will use <strong>live</strong> prices.</li>
                 <li>After the trial, Stripe will charge real cards.</li>
                 <li>Existing test-mode <code>cus_</code> / <code>sub_</code> rows will not work on live keys.</li>
                 <li>GitHub variable <code>STRIPE_MODE</code> will be set to <code>live</code>.</li>`
              : `<li>Marketing signup will use <strong>test</strong> prices again.</li>
                 <li>Live customers and subscriptions will not work on test keys.</li>
                 <li>GitHub variable <code>STRIPE_MODE</code> will be set to <code>test</code>.</li>`
          }
        </ul>
        ${
          openSubscriptions > 0
            ? `<label class="field stripe-mode-ack">
                 <input type="checkbox" name="acknowledgeOpenSubscriptions">
                 <span>I understand the ${openSubscriptions} open subscription${openSubscriptions === 1 ? '' : 's'} in D1 will not work after this switch.</span>
               </label>`
            : ''
        }
        <label class="field">
          <span>Type <code>${confirmation}</code> to confirm</span>
          <input type="text" name="confirmation" autocomplete="off" spellcheck="false">
        </label>
        <p class="marketing-access-message" data-stripe-mode-error hidden></p>
      </div>
      <div class="wizard-foot">
        <button type="button" class="btn btn-ghost" data-stripe-mode-cancel>Cancel</button>
        <button type="button" class="btn ${goingLive ? 'btn-danger' : ''}" data-stripe-mode-submit>${goingLive ? 'Go live' : 'Use test mode'}</button>
      </div>
    </div>
  `;

  function close() {
    overlay.remove();
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  overlay.querySelectorAll('[data-stripe-mode-cancel]').forEach((button) => {
    button.addEventListener('click', close);
  });

  const submit = overlay.querySelector('[data-stripe-mode-submit]');
  submit?.addEventListener('click', async () => {
    const confirmationInput = overlay.querySelector('input[name="confirmation"]');
    const ackInput = overlay.querySelector('input[name="acknowledgeOpenSubscriptions"]');
    const errorEl = overlay.querySelector('[data-stripe-mode-error]');
    const typed = confirmationInput instanceof HTMLInputElement ? confirmationInput.value : '';
    const acknowledged = ackInput instanceof HTMLInputElement ? ackInput.checked : openSubscriptions === 0;
    submit.setAttribute('disabled', 'true');
    if (errorEl instanceof HTMLElement) {
      errorEl.hidden = true;
      errorEl.textContent = '';
    }
    try {
      const result = await setStripeMode({
        mode: nextMode,
        confirmation: typed,
        acknowledgeOpenSubscriptions: acknowledged
      });
      close();
      await reload();
      if (result.githubWarning) {
        window.alert(String(result.githubWarning));
      }
    } catch (error) {
      if (errorEl instanceof HTMLElement) {
        errorEl.hidden = false;
        errorEl.textContent = error instanceof Error ? error.message : String(error);
      } else {
        onError(error);
      }
      submit.removeAttribute('disabled');
    }
  });

  document.body.appendChild(overlay);
  overlay.querySelector('input[name="confirmation"]')?.focus();
}

/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
