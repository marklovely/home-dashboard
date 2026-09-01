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
 * @param {{ stripeConfigured: boolean; billingDbConfigured: boolean; hubHealthy?: boolean }} options
 */
export function renderSiteBilling(site, billing, options) {
  const { stripeConfigured, billingDbConfigured, hubHealthy = false } = options;
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
        <button type="button" class="btn btn-small" data-billing-checkout="${escapeHtml(siteId)}">Start 7-day trial</button>
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
    if (hubHealthy) {
      provisionHint =
        '<p class="billing-hint">This hub is already live (health checks passed). The platform manifest on this dashboard is stale — rebuild it, do not provision again.</p>';
    } else if (provisionError) {
      provisionHint = `<p class="billing-hint billing-hint-warn">${escapeHtml(provisionError)} Click <strong>Provision</strong> to retry.</p>`;
    } else if (provisionDispatched) {
      provisionHint =
        '<p class="billing-hint">Provision workflow dispatched — check GitHub Actions. If it failed, click <strong>Provision</strong> to retry.</p>';
    } else {
      provisionHint =
        '<p class="billing-hint billing-hint-warn">Billing is active but this card has no Terraform contract yet. Click <strong>Provision</strong> only if the hub itself is still empty.</p>';
    }
  }

  const deprovisionDispatched = Boolean(billing.deprovision_dispatched_at);
  const deprovisionError = billing.deprovision_last_error ? String(billing.deprovision_last_error) : '';
  const archiveKey = billing.archive_r2_key ? String(billing.archive_r2_key) : '';

  let deprovisionHint = '';
  if (status === 'canceled') {
    if (deprovisionError) {
      deprovisionHint = `<p class="billing-hint billing-hint-warn">${escapeHtml(deprovisionError)} Deprovision may need a manual workflow retry.</p>`;
    } else if (deprovisionDispatched) {
      deprovisionHint =
        '<p class="billing-hint">Deprovision workflow dispatched — hub archive + teardown in progress. Check GitHub Actions.</p>';
    }
    if (archiveKey) {
      deprovisionHint += `<p class="billing-hint billing-meta">Archive: <code>${escapeHtml(archiveKey)}</code></p>`;
    }
  } else if (status === 'past_due') {
    deprovisionHint =
      '<p class="billing-hint billing-hint-warn">Payment past due — Stripe will retry. Hub stays live until subscription is canceled.</p>';
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
    ${deprovisionHint}
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
