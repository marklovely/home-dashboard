import { resetMarketingPricing, saveMarketingPricing } from './api.js';
import { panelFoldOpenAttr, wirePanelFold } from './panelFold.js';

const MARKETING_PRICING_FOLD_ID = 'marketing-pricing-fold';

/**
 * @param {Record<string, unknown> | null | undefined} data
 * @param {boolean} billingDbConfigured
 */
export function renderMarketingPricingPanel(data, billingDbConfigured) {
  if (!billingDbConfigured) {
    return `
      <section class="panel marketing-pricing" id="marketing-pricing">
        <details class="panel-fold" id="${MARKETING_PRICING_FOLD_ID}"${panelFoldOpenAttr(MARKETING_PRICING_FOLD_ID)}>
          <summary class="panel-fold-summary"><span class="panel-fold-title">Marketing pricing copy</span></summary>
          <div class="panel-fold-body">
            <p class="muted">Bind <code>PLATFORM_BILLING_DB</code> and apply billing migrations, including <code>0013_marketing_pricing_display.sql</code>.</p>
          </div>
        </details>
      </section>
    `;
  }

  if (!data?.ok) {
    return `
      <section class="panel marketing-pricing" id="marketing-pricing">
        <details class="panel-fold" id="${MARKETING_PRICING_FOLD_ID}"${panelFoldOpenAttr(MARKETING_PRICING_FOLD_ID)}>
          <summary class="panel-fold-summary"><span class="panel-fold-title">Marketing pricing copy</span></summary>
          <div class="panel-fold-body">
            <p class="banner banner-warn">${escapeHtml(String(data?.message ?? 'Could not load marketing pricing.'))}</p>
          </div>
        </details>
      </section>
    `;
  }

  const hasOverrides = data.hasOverrides === true;
  const stripe = /** @type {Record<string, unknown>} */ (data.stripeDefaults ?? {});
  const effective = /** @type {Record<string, unknown>} */ (data.effective ?? {});
  const stripeIntro = /** @type {Record<string, unknown>} */ (stripe.introOffer ?? {});
  const effectiveIntro = /** @type {Record<string, unknown>} */ (effective.introOffer ?? {});
  const stripeReferral = /** @type {Record<string, unknown>} */ (stripe.referral ?? {});
  const effectiveReferral = /** @type {Record<string, unknown>} */ (effective.referral ?? {});

  return `
    <section class="panel marketing-pricing" id="marketing-pricing">
      <details class="panel-fold" id="${MARKETING_PRICING_FOLD_ID}"${panelFoldOpenAttr(MARKETING_PRICING_FOLD_ID)}>
        <summary class="panel-fold-summary">
          <span class="panel-fold-title">Marketing pricing copy</span>
          ${hasOverrides ? '<span class="panel-fold-summary-trailing"><span class="badge badge-ok">Custom copy</span></span>' : ''}
        </summary>
        <div class="panel-fold-body">
          <p class="muted">Edit what lovely-home.co.uk shows for prices, trials, intro offer, and referrals. <strong>Stripe checkout still uses your configured price IDs and coupons</strong> — change those in Stripe and Terraform. Display-only overrides are stored in D1.</p>
          <p class="marketing-pricing-message" id="marketing-pricing-message" hidden></p>
          <form class="marketing-pricing-form" id="marketing-pricing-form">
            <div class="form-section">
              <h3 class="form-section__title">Core pricing</h3>
              <div class="form-grid">
                ${renderField('productName', 'Product name', effective.productName, stripe.productName)}
                ${renderField('trialDays', 'Trial days (display)', effective.trialDays, stripe.trialDays, 'number')}
                ${renderField('monthlyLabel', 'Monthly label', effective.monthlyLabel, stripe.monthlyLabel)}
                ${renderField('yearlyLabel', 'Yearly label', effective.yearlyLabel, stripe.yearlyLabel)}
                ${renderField('annualSavingsLabel', 'Annual savings line', effective.annualSavingsLabel, stripe.annualSavingsLabel, 'text', true)}
                ${renderField('checkoutSummary', 'Checkout summary', effective.checkoutSummary, stripe.checkoutSummary, 'textarea', true)}
                ${renderField('signupSummary', 'Signup summary', effective.signupSummary, stripe.signupSummary, 'textarea', true)}
              </div>
            </div>
            <div class="form-section">
              <h3 class="form-section__title">Intro offer wording</h3>
              <div class="form-grid">
                ${renderField('introOffer.monthlyBenefit', 'Monthly benefit', effectiveIntro.monthlyBenefit, stripeIntro.monthlyBenefit, 'textarea', true)}
                ${renderField('introOffer.yearlyBenefit', 'Yearly benefit', effectiveIntro.yearlyBenefit, stripeIntro.yearlyBenefit, 'textarea', true)}
                ${renderField('introOffer.checkoutNote', 'Checkout note', effectiveIntro.checkoutNote, stripeIntro.checkoutNote, 'textarea', true)}
              </div>
            </div>
            <div class="form-section">
              <h3 class="form-section__title">Refer a friend wording</h3>
              <div class="form-grid">
                ${renderField('referral.monthlyReferee', 'Friend — monthly plan', effectiveReferral.monthlyReferee, stripeReferral.monthlyReferee, 'textarea', true)}
                ${renderField('referral.yearlyReferee', 'Friend — yearly plan', effectiveReferral.yearlyReferee, stripeReferral.yearlyReferee, 'textarea', true)}
                ${renderField('referral.monthlyReferrer', 'You — monthly referral', effectiveReferral.monthlyReferrer, stripeReferral.monthlyReferrer, 'textarea', true)}
                ${renderField('referral.yearlyReferrer', 'You — yearly referral', effectiveReferral.yearlyReferrer, stripeReferral.yearlyReferrer, 'textarea', true)}
              </div>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">Save marketing copy</button>
              <button type="button" class="btn btn-ghost" data-marketing-pricing-reset>Reset to Stripe defaults</button>
            </div>
          </form>
        </div>
      </details>
    </section>
  `;
}

/**
 * @param {string} name
 * @param {string} label
 * @param {unknown} value
 * @param {unknown} stripeDefault
 * @param {'text' | 'textarea' | 'number'} [type]
 * @param {boolean} [wide]
 */
function renderField(name, label, value, stripeDefault, type = 'text', wide = false) {
  const current = value == null ? '' : String(value);
  const placeholder = stripeDefault == null ? '' : String(stripeDefault);
  const input =
    type === 'textarea'
      ? `<textarea id="field-${escapeAttr(name)}" name="${escapeAttr(name)}" rows="2" placeholder="${escapeAttr(placeholder)}" data-stripe-default="${escapeAttr(placeholder)}">${escapeHtml(current)}</textarea>`
      : `<input id="field-${escapeAttr(name)}" name="${escapeAttr(name)}" type="${type}" value="${escapeAttr(current)}" placeholder="${escapeAttr(placeholder)}" data-stripe-default="${escapeAttr(placeholder)}" />`;
  return `
    <label class="field marketing-pricing-field${wide ? ' field-wide' : ''}" for="field-${escapeAttr(name)}">
      <span class="field-label">${escapeHtml(label)}</span>
      ${stripeDefault != null && String(stripeDefault).trim() ? `<span class="field-hint">Stripe default: ${escapeHtml(String(stripeDefault))}</span>` : ''}
      ${input}
    </label>
  `;
}

/**
 * @param {(error: unknown) => void} onError
 * @param {() => Promise<void>} reload
 */
export function wireMarketingPricingPanel(onError, reload) {
  wirePanelFold(MARKETING_PRICING_FOLD_ID);
  const form = document.getElementById('marketing-pricing-form');
  const messageEl = document.getElementById('marketing-pricing-message');
  const resetButton = document.querySelector('[data-marketing-pricing-reset]');

  /**
   * @param {string} text
   * @param {'ok' | 'error'} kind
   */
  function showMessage(text, kind) {
    if (!(messageEl instanceof HTMLElement)) return;
    messageEl.hidden = false;
    messageEl.textContent = text;
    messageEl.className = `marketing-pricing-message marketing-pricing-message--${kind}`;
  }

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!(form instanceof HTMLFormElement)) return;
    const submit = form.querySelector('[type="submit"]');
    submit?.setAttribute('disabled', 'true');
    try {
      const overrides = collectOverridesFromForm(form);
      await saveMarketingPricing({ overrides });
      showMessage('Marketing copy saved. Public pricing API updates within a few minutes (cache).', 'ok');
      await reload();
    } catch (error) {
      onError(error);
    } finally {
      submit?.removeAttribute('disabled');
    }
  });

  resetButton?.addEventListener('click', async () => {
    if (!window.confirm('Clear all custom marketing copy and revert to Stripe-derived defaults?')) return;
    resetButton.setAttribute('disabled', 'true');
    try {
      await resetMarketingPricing();
      showMessage('Marketing copy reset to Stripe defaults.', 'ok');
      await reload();
    } catch (error) {
      onError(error);
    } finally {
      resetButton.removeAttribute('disabled');
    }
  });
}

/**
 * @param {HTMLFormElement} form
 */
function collectOverridesFromForm(form) {
  const data = new FormData(form);
  /** @type {Record<string, unknown>} */
  const overrides = {};
  /** @type {Record<string, unknown>} */
  const introOffer = {};
  /** @type {Record<string, unknown>} */
  const referral = {};

  for (const [name, rawValue] of data.entries()) {
    const field = form.elements.namedItem(name);
    const stripeDefault =
      field instanceof HTMLElement ? String(field.getAttribute('data-stripe-default') ?? '').trim() : '';
    const value = String(rawValue ?? '').trim();
    if (!value || value === stripeDefault) continue;
    if (name.startsWith('introOffer.')) {
      introOffer[name.slice('introOffer.'.length)] = value;
      continue;
    }
    if (name.startsWith('referral.')) {
      referral[name.slice('referral.'.length)] = value;
      continue;
    }
    if (name === 'trialDays') {
      const trialDays = Number(value);
      if (Number.isFinite(trialDays)) overrides.trialDays = trialDays;
      continue;
    }
    overrides[name] = value;
  }

  if (Object.keys(introOffer).length) overrides.introOffer = introOffer;
  if (Object.keys(referral).length) overrides.referral = referral;
  return overrides;
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

/**
 * @param {string} value
 */
function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
