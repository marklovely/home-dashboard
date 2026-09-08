import { setIntroOfferEnabled } from './api.js';
import { panelFoldOpenAttr, wirePanelFold } from './panelFold.js';

const INTRO_OFFER_FOLD_ID = 'intro-offer-fold';

/**
 * @param {Record<string, unknown> | null | undefined} introOffer
 * @param {boolean} billingDbConfigured
 */
export function renderIntroOfferPanel(introOffer, billingDbConfigured) {
  if (!billingDbConfigured) {
    return `
      <section class="panel intro-offer" id="intro-offer">
        <details class="panel-fold" id="${INTRO_OFFER_FOLD_ID}"${panelFoldOpenAttr(INTRO_OFFER_FOLD_ID)}>
          <summary class="panel-fold-summary"><span class="panel-fold-title">Introductory offer</span></summary>
          <div class="panel-fold-body">
            <p class="muted">Bind <code>PLATFORM_BILLING_DB</code> and apply billing migrations, including <code>0010_intro_offer_setting.sql</code>.</p>
          </div>
        </details>
      </section>
    `;
  }

  const enabled = introOffer?.enabled === true;
  const configured = introOffer?.configured === true;
  const active = introOffer?.active === true;
  const badgeClass = active ? 'badge-ok' : enabled ? 'badge-warn' : '';
  const badgeLabel = active ? 'Active' : enabled ? 'Enabled — coupons missing' : 'Off';

  let banner = '';
  if (enabled && !configured) {
    banner =
      '<div class="banner banner-warn">Intro offer is enabled in D1 but Stripe intro coupons are missing on the Pages project. Add <code>STRIPE_INTRO_COUPON_*</code> via Terraform.</div>';
  }

  const toggleButton = enabled
    ? '<button type="button" class="btn btn-small btn-ghost" data-intro-offer-set="false">Turn off intro offer</button>'
    : `<button type="button" class="btn btn-small" data-intro-offer-set="true"${configured ? '' : ' disabled'}>Turn on intro offer</button>`;

  return `
    <section class="panel intro-offer" id="intro-offer">
      <details class="panel-fold" id="${INTRO_OFFER_FOLD_ID}"${panelFoldOpenAttr(INTRO_OFFER_FOLD_ID)}>
        <summary class="panel-fold-summary"><span class="panel-fold-title">Introductory offer</span>${badgeLabel ? `<span class="panel-fold-summary-trailing"><span class="badge ${badgeClass}">${escapeHtml(badgeLabel)}</span></span>` : ''}</summary>
        <div class="panel-fold-body">
          ${banner}
          <p class="muted">Automatic discount for <strong>new households</strong> at public signup (email never billed before). Referral links take precedence. Operator billing checkout is never discounted.</p>
          <ul class="stripe-mode-facts">
            <li>Monthly benefit: ${escapeHtml(String(introOffer?.monthlyBenefit ?? '—'))}</li>
            <li>Yearly benefit: ${escapeHtml(String(introOffer?.yearlyBenefit ?? '—'))}</li>
            <li>Stripe coupons: ${configured ? 'configured' : 'missing'}</li>
          </ul>
          ${!configured ? '<p class="muted">Create intro coupons in Stripe (test + live), then add ids to <code>hub.tfvars</code> and terraform apply.</p>' : ''}
          <div class="stripe-mode-actions">${toggleButton}</div>
        </div>
      </details>
    </section>
  `;
}

/**
 * @param {(error: unknown) => void} onError
 * @param {() => Promise<void>} reload
 */
export function wireIntroOfferPanel(onError, reload) {
  wirePanelFold(INTRO_OFFER_FOLD_ID);
  document.querySelectorAll('[data-intro-offer-set]').forEach((button) => {
    button.addEventListener('click', async () => {
      const enabled = button.getAttribute('data-intro-offer-set') === 'true';
      button.setAttribute('disabled', 'true');
      try {
        await setIntroOfferEnabled({ enabled });
        await reload();
      } catch (error) {
        onError(error);
        button.removeAttribute('disabled');
      }
    });
  });
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
