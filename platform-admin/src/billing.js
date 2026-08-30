/** @typedef {'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete'} BillingStatus */

/** Sites that never show billing checkout in platform admin. */
export const BILLING_UI_BLOCKED_SITE_IDS = new Set(['production', 'demo']);

/**
 * @param {string} siteId
 * @param {Record<string, unknown> | null | undefined} billing
 * @param {boolean} stripeConfigured
 */
export function canStartBillingTrial(siteId, billing, stripeConfigured) {
  if (!stripeConfigured) return false;
  if (BILLING_UI_BLOCKED_SITE_IDS.has(siteId)) return false;
  if (!billing) return true;
  const status = String(billing.status ?? '');
  return status !== 'trialing' && status !== 'active';
}

/**
 * @param {BillingStatus | string} status
 */
export function billingStatusBadgeClass(status) {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'badge-ok';
    case 'past_due':
    case 'incomplete':
      return 'badge-warn';
    case 'canceled':
      return 'badge-bad';
    default:
      return '';
  }
}

/**
 * @param {BillingStatus | string} status
 */
export function billingStatusLabel(status) {
  switch (status) {
    case 'trialing':
      return 'Trial';
    case 'active':
      return 'Active';
    case 'past_due':
      return 'Past due';
    case 'canceled':
      return 'Canceled';
    case 'incomplete':
      return 'Incomplete';
    default:
      return String(status || 'unknown');
  }
}

/**
 * @param {number | null | undefined} trialEndMs
 */
export function formatBillingTrialEnd(trialEndMs) {
  if (!trialEndMs) return '';
  const date = new Date(Number(trialEndMs));
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

/**
 * @param {Record<string, unknown>} site
 * @param {Record<string, unknown> | null | undefined} billing
 * @param {{ stripeConfigured: boolean; billingDbConfigured: boolean }} options
 */
export function renderSiteBilling(site, billing, options) {
  const { stripeConfigured, billingDbConfigured } = options;
  if (!stripeConfigured && !billingDbConfigured) return '';

  const siteId = String(site.siteId);
  const hasContract = Boolean(site.contract);
  const showStartTrial = canStartBillingTrial(siteId, billing, stripeConfigured);

  if (!billing) {
    if (!showStartTrial) return '';
    return `
      <div class="billing">
        <span class="billing-label">Billing</span>
        <span class="billing-muted">No subscription</span>
        <button type="button" class="btn btn-small" data-billing-checkout="${escapeHtml(siteId)}">Start 14-day trial</button>
      </div>
    `;
  }

  const status = String(billing.status ?? 'unknown');
  const badgeClass = billingStatusBadgeClass(status);
  const trialEnd = formatBillingTrialEnd(/** @type {number | null | undefined} */ (billing.trial_end));
  const ownerEmail = billing.owner_email ? String(billing.owner_email) : '';
  const provisionDispatched = Boolean(billing.provision_dispatched_at);
  const provisionError = billing.provision_last_error ? String(billing.provision_last_error) : '';

  let provisionHint = '';
  if ((status === 'trialing' || status === 'active') && site.terraform && !hasContract) {
    if (provisionError) {
      provisionHint = `<p class="billing-hint billing-hint-warn">${escapeHtml(provisionError)} Click <strong>Provision</strong> to retry.</p>`;
    } else if (provisionDispatched) {
      provisionHint =
        '<p class="billing-hint">Provision workflow dispatched — check GitHub Actions. If it failed, click <strong>Provision</strong> to retry.</p>';
    } else {
      provisionHint =
        '<p class="billing-hint billing-hint-warn">Billing is active but infrastructure is not provisioned yet. Click <strong>Provision</strong> to deploy this hub.</p>';
    }
  }

  return `
    <div class="billing">
      <span class="billing-label">Billing</span>
      <span class="badge ${badgeClass}">${escapeHtml(billingStatusLabel(status))}</span>
      ${trialEnd && status === 'trialing' ? `<span class="billing-meta">trial ends ${escapeHtml(trialEnd)}</span>` : ''}
      ${ownerEmail ? `<span class="billing-meta">${escapeHtml(ownerEmail)}</span>` : ''}
      ${showStartTrial ? `<button type="button" class="btn btn-small btn-ghost" data-billing-checkout="${escapeHtml(siteId)}">Start new trial</button>` : ''}
    </div>
    ${provisionHint}
  `;
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
