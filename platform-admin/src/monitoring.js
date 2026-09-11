import { formatUsageLineWithLimit, usageToneWithLimit } from './usageFormat.js';
import { renderLinkChip } from './links.js';
import { statusLabel } from './health.js';

/**
 * @param {Record<string, unknown>} data
 */
export function renderMonitoringView(data) {
  const overview = /** @type {Record<string, unknown>} */ (data.overview ?? {});
  const healthCounts = /** @type {Record<string, number>} */ (overview.healthCounts ?? {});
  const integrations = /** @type {Record<string, boolean>} */ (data.integrations ?? {});
  const links = /** @type {Record<string, string | null>} */ (data.links ?? {});

  return `
    <p class="meta monitoring-meta">
      Snapshot ${escapeHtml(formatTime(data.generatedAt))}
      · manifest ${escapeHtml(formatTime(data.manifestGeneratedAt))}
    </p>

    <section class="monitoring-strip">
      ${renderOverviewTile('Sites', String(overview.siteCount ?? '—'))}
      ${renderOverviewTile('Terraform hubs', String(overview.terraformCount ?? '—'))}
      ${renderOverviewTile('Healthy', String(healthCounts.healthy ?? 0), 'ok')}
      ${renderOverviewTile('Degraded', String(healthCounts.degraded ?? 0), healthCounts.degraded ? 'warn' : 'ok')}
      ${renderOverviewTile('Unhealthy', String(healthCounts.bad ?? 0), healthCounts.bad ? 'bad' : 'ok')}
      ${renderOverviewTile('Open billing', String(data.billing?.openSubscriptions ?? '—'))}
    </section>

    <div class="monitoring-grid">
      ${renderIntegrationsPanel(integrations)}
      ${renderCloudflarePanel(data.cloudflare ?? {}, links)}
      ${renderThirdPartyPanel(data.thirdParty ?? {}, links)}
      ${renderBillingPanel(data.billing ?? {}, links)}
      ${renderMarketingPanel(data.marketing ?? {}, links)}
      ${renderAutomationPanel(data.automation ?? {}, links)}
    </div>

    <section class="panel monitoring-panel">
      <div class="panel-head">
        <h2>Hub health matrix</h2>
        <p class="muted">Worker health, HUB_API binding, and Access probe for every site in the manifest.</p>
      </div>
      ${renderHubHealthTable(data.hubs ?? [])}
    </section>

    <section class="panel monitoring-panel">
      <div class="panel-head">
        <h2>External dashboards</h2>
      </div>
      <div class="link-row">
        ${renderLinkChip('Cloudflare account', links.cloudflare)}
        ${renderLinkChip('Cloudflare billing', links.cloudflareBilling)}
        ${renderLinkChip('OS Data Hub', links.osDataHub)}
        ${renderLinkChip('Workers & Pages', links.cloudflareWorkers)}
        ${renderLinkChip('D1', links.cloudflareD1)}
        ${renderLinkChip('R2', links.cloudflareR2)}
        ${renderLinkChip('Stripe', links.stripe)}
        ${renderLinkChip('GitHub Actions', links.githubActions)}
        ${renderLinkChip('Marketing site', links.marketingSite)}
        ${renderLinkChip('Platform admin', links.platformAdmin)}
      </div>
    </section>
  `;
}

/**
 * @param {string} label
 * @param {string} value
 * @param {'ok' | 'warn' | 'bad'} [tone]
 */
function renderOverviewTile(label, value, tone = 'ok') {
  return `
    <div class="monitoring-tile monitoring-${tone}">
      <span class="monitoring-tile-label">${escapeHtml(label)}</span>
      <span class="monitoring-tile-value">${escapeHtml(value)}</span>
    </div>
  `;
}

/**
 * @param {Record<string, boolean>} integrations
 */
function renderIntegrationsPanel(integrations) {
  const rows = [
    ['Health service auth', integrations.healthServiceAuthConfigured],
    ['Cloudflare usage API', integrations.cloudflareUsageConfigured],
    ['Cloudflare Pages API', integrations.cloudflarePagesConfigured],
    ['GitHub automation', integrations.githubAutomationConfigured],
    ['Stripe billing', integrations.stripeBillingConfigured],
    ['Platform billing DB', integrations.platformBillingDbConfigured]
  ];

  return `
    <section class="panel monitoring-panel">
      <h2>Integrations</h2>
      <ul class="monitoring-list">
        ${rows
          .map(
            ([label, ok]) =>
              `<li class="${ok ? 'ok' : 'warn'}">${escapeHtml(String(label))} — ${ok ? 'configured' : 'missing'}</li>`
          )
          .join('')}
      </ul>
    </section>
  `;
}

/**
 * @param {Record<string, unknown>} cloudflare
 * @param {Record<string, string | null>} links
 */
function renderCloudflarePanel(cloudflare, links) {
  const storage = /** @type {Record<string, unknown>} */ (cloudflare.storage ?? {});
  const billing = /** @type {Record<string, unknown>} */ (cloudflare.billing ?? {});
  const billingUsage = /** @type {Record<string, unknown>} */ (billing.usage ?? {});
  const billingSummary = /** @type {Record<string, unknown>} */ (billingUsage.summary ?? {});
  const inventory = /** @type {Record<string, unknown> | null} */ (cloudflare.inventory ?? null);
  const d1Match = /** @type {Record<string, unknown>} */ (cloudflare.d1Match ?? {});
  const plan = /** @type {Record<string, unknown>} */ (cloudflare.plan ?? {});

  let storageHtml = `<p class="muted">${escapeHtml(String(storage.message ?? 'Storage usage not available'))}</p>`;
  if (storage.ok) {
    const r2Bytes = Number(/** @type {Record<string, unknown>} */ (storage.r2)?.totalBytes ?? 0);
    const r2Limit = Number(/** @type {Record<string, unknown>} */ (storage.r2)?.limitBytes ?? 0);
    const r2ShowLimit = /** @type {Record<string, unknown>} */ (storage.r2)?.showLimit !== false;
    const d1Bytes = Number(/** @type {Record<string, unknown>} */ (storage.d1)?.totalBytes ?? 0);
    const d1Limit = Number(/** @type {Record<string, unknown>} */ (storage.d1)?.limitBytes ?? 0);
    storageHtml = `
      <div class="usage-grid">
        <div class="usage-metric usage-${usageToneWithLimit(r2Bytes, r2Limit, r2ShowLimit)}">
          <span class="usage-label">Account R2</span>
          <span class="usage-value">${escapeHtml(formatUsageLineWithLimit(r2Bytes, r2Limit, r2ShowLimit))}</span>
        </div>
        <div class="usage-metric usage-${usageToneWithLimit(d1Bytes, d1Limit, true)}">
          <span class="usage-label">Hub D1 total</span>
          <span class="usage-value">${escapeHtml(formatUsageLineWithLimit(d1Bytes, d1Limit, true))}</span>
        </div>
      </div>
    `;
  }

  let inventoryHtml = '<p class="muted">Resource inventory needs PLATFORM_CF_API_TOKEN.</p>';
  if (inventory && inventory.ok !== false) {
    const d1 = /** @type {Record<string, unknown>} */ (inventory.d1 ?? {});
    const r2 = /** @type {Record<string, unknown>} */ (inventory.r2 ?? {});
    const workers = /** @type {Record<string, unknown>} */ (inventory.workers ?? {});
    const pages = /** @type {Record<string, unknown>} */ (inventory.pages ?? {});
    inventoryHtml = `
      <ul class="monitoring-list">
        <li>D1 databases <strong>${escapeHtml(String(d1.count ?? '—'))}</strong> / ${escapeHtml(String(d1.limit ?? '—'))} (${escapeHtml(String(plan.workersPlanLabel ?? 'Workers'))} limit)</li>
        <li>Hub D1 in manifest <strong>${escapeHtml(String(d1Match.hubCount ?? '—'))}</strong>${d1Match.orphanOnAccount != null ? ` · ${escapeHtml(String(d1Match.orphanOnAccount))} orphan on account` : ''}</li>
        <li>R2 buckets <strong>${escapeHtml(String(r2.count ?? '—'))}</strong></li>
        <li>Worker scripts <strong>${escapeHtml(String(workers.count ?? '—'))}</strong></li>
        <li>Pages projects <strong>${escapeHtml(String(pages.count ?? '—'))}</strong></li>
      </ul>
    `;
    if (Array.isArray(inventory.errors) && inventory.errors.length) {
      inventoryHtml += `<p class="muted monitoring-note">${escapeHtml(String(/** @type {Record<string, unknown>[]} */ (inventory.errors).map((row) => `${row.resource}: ${row.message}`).join(' · ')))}</p>`;
    }
  } else if (inventory?.error) {
    inventoryHtml = `<p class="muted">${escapeHtml(String(inventory.error))}</p>`;
  }

  let billingHtml = '';
  if (billingUsage.ok) {
    const products = Array.isArray(billingSummary.products) ? billingSummary.products : [];
    const range = /** @type {Record<string, unknown>} */ (billing.range ?? {});
    billingHtml = `
      <div class="monitoring-subsection">
        <h3>Billable usage (${escapeHtml(String(range.label ?? 'this month'))})</h3>
        <p class="monitoring-cost-total">
          Total <strong>${escapeHtml(formatMoney(Number(billingSummary.totalCost ?? 0), String(billingSummary.currency ?? 'GBP')))}</strong>
        </p>
        ${
          products.length
            ? `<ul class="monitoring-list">${products
                .slice(0, 6)
                .map((product) => {
                  const row = /** @type {Record<string, unknown>} */ (product);
                  const quantity =
                    row.quantity != null && row.unit
                      ? ` · ${escapeHtml(String(row.quantity))} ${escapeHtml(String(row.unit))}`
                      : '';
                  return `<li>${escapeHtml(String(row.label ?? 'Usage'))} — <strong>${escapeHtml(formatMoney(Number(row.cost ?? 0), String(billingSummary.currency ?? 'GBP')))}</strong>${quantity}</li>`;
                })
                .join('')}</ul>`
            : '<p class="muted">No billable usage rows returned for this period yet.</p>'
        }
        <p class="muted monitoring-note">Updated daily by Cloudflare. Token needs Billing: Read.</p>
      </div>
    `;
  } else if (billingUsage.message || billing.message) {
    billingHtml = `
      <div class="monitoring-subsection">
        <h3>Billable usage</h3>
        <p class="muted">${escapeHtml(String(billingUsage.message ?? billing.message ?? 'Not available'))}</p>
      </div>
    `;
  }

  return `
    <section class="panel monitoring-panel">
      <div class="panel-head">
        <h2>Cloudflare</h2>
        ${renderLinkChip('Open dashboard', links.cloudflare)}
        ${renderLinkChip('Billing', links.cloudflareBilling)}
      </div>
      ${billingHtml}
      ${storageHtml}
      ${inventoryHtml}
      <p class="muted monitoring-note">${escapeHtml(formatPlanLimitsNote(plan))}</p>
    </section>
  `;
}

/**
 * @param {Record<string, unknown>} thirdParty
 * @param {Record<string, string | null>} links
 */
function renderThirdPartyPanel(thirdParty, links) {
  const osPlaces = /** @type {Record<string, unknown>} */ (thirdParty.osPlaces ?? {});

  const topHubs = Array.isArray(osPlaces.hubs)
    ? osPlaces.hubs.filter((hub) => Number(/** @type {Record<string, unknown>} */ (hub).monthCalls) > 0).slice(0, 5)
    : [];

  return `
    <section class="panel monitoring-panel">
      <div class="panel-head">
        <h2>Third-party APIs</h2>
        ${renderLinkChip('OS Data Hub', links.osDataHub)}
      </div>
      <ul class="monitoring-list">
        <li>OS Places (UPRN lookups) — <strong>${escapeHtml(String(osPlaces.monthTotal ?? 0))}</strong> calls this month</li>
        <li>Lifetime total across hubs — <strong>${escapeHtml(String(osPlaces.lifetimeTotal ?? 0))}</strong></li>
        <li>Hubs reporting — <strong>${escapeHtml(String(osPlaces.reachableHubs ?? 0))}</strong> / ${escapeHtml(String(osPlaces.hubCount ?? 0))}</li>
      </ul>
      ${
        topHubs.length
          ? `<ul class="monitoring-list">${topHubs
              .map((hub) => {
                const row = /** @type {Record<string, unknown>} */ (hub);
                return `<li>${escapeHtml(String(row.siteId))} — ${escapeHtml(String(row.monthCalls))} this month</li>`;
              })
              .join('')}</ul>`
          : '<p class="muted">No OS Places calls recorded yet. Counters start after hub Workers with usage tracking are deployed.</p>'
      }
      <p class="muted monitoring-note">OS Data Hub has no public usage API — these counts are recorded per hub when UPRN lookup runs. Check OS Data Hub dashboard for official quota.</p>
    </section>
  `;
}

/**
 * @param {number} amount
 * @param {string} currency
 */
function formatMoney(amount, currency) {
  if (!Number.isFinite(amount)) return '—';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency || 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

/**
 * @param {Record<string, unknown>} plan
 */
function formatPlanLimitsNote(plan) {
  const workersLabel = String(plan.workersPlanLabel ?? 'Workers Free');
  const r2Label = String(plan.r2PlanLabel ?? 'R2 Free');
  if (plan.workersPlan === 'paid') {
    return `${workersLabel} + ${r2Label}: D1 account storage up to 1 TB, 50,000 databases max (10 GB per database). R2 is usage-based with no 10 GB free cap. Set PLATFORM_CF_WORKERS_PLAN=paid on the platform Pages project.`;
  }
  return `${workersLabel}: 10 GB R2 and 5 GB D1 account storage included. Up to 10 D1 databases. Set PLATFORM_CF_WORKERS_PLAN=paid if this account is on Workers Paid.`;
}

/**
 * @param {Record<string, unknown>} billing
 * @param {Record<string, string | null>} links
 */
function renderBillingPanel(billing, links) {
  const stripe = /** @type {Record<string, unknown>} */ (billing.stripe ?? {});
  const summary = /** @type {Record<string, unknown>} */ (billing.summary ?? {});
  const byStatus = /** @type {Record<string, number>} */ (summary.byStatus ?? {});

  const statusRows = Object.entries(byStatus)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([status, count]) => `<li>${escapeHtml(status)} — <strong>${count}</strong></li>`)
    .join('');

  return `
    <section class="panel monitoring-panel">
      <div class="panel-head">
        <h2>Billing</h2>
        ${renderLinkChip('Stripe dashboard', links.stripe)}
      </div>
      <ul class="monitoring-list">
        <li>Stripe mode <strong>${escapeHtml(String(stripe.mode ?? '—'))}</strong> (${escapeHtml(String(stripe.keyPrefix ?? 'no key'))})</li>
        <li>Open subscriptions <strong>${escapeHtml(String(billing.openSubscriptions ?? 0))}</strong></li>
        <li>Billing records <strong>${escapeHtml(String(summary.total ?? 0))}</strong></li>
      </ul>
      ${statusRows ? `<ul class="monitoring-list">${statusRows}</ul>` : '<p class="muted">No billing rows in PLATFORM_BILLING_DB yet.</p>'}
    </section>
  `;
}

/**
 * @param {Record<string, unknown>} marketing
 * @param {Record<string, string | null>} links
 */
function renderMarketingPanel(marketing, links) {
  const home = /** @type {Record<string, unknown>} */ (marketing.home ?? {});
  const pricing = /** @type {Record<string, unknown>} */ (marketing.pricingApi ?? {});
  const signup = /** @type {Record<string, unknown>} */ (marketing.signupStatus ?? {});

  return `
    <section class="panel monitoring-panel">
      <div class="panel-head">
        <h2>Marketing & signup</h2>
        ${renderLinkChip('Marketing site', links.marketingSite)}
      </div>
      <ul class="monitoring-list">
        <li class="${home.ok ? 'ok' : 'bad'}">Homepage ${escapeHtml(String(marketing.origin ?? ''))} — HTTP ${escapeHtml(String(home.status ?? '—'))} (${escapeHtml(String(home.elapsedMs ?? '—'))} ms)</li>
        <li class="${pricing.ok ? 'ok' : 'bad'}">Pricing API — HTTP ${escapeHtml(String(pricing.status ?? '—'))}${pricing.configured === true ? ' · Stripe prices loaded' : pricing.configured === false ? ' · not configured' : ''}</li>
        <li class="${signup.ok ? 'ok' : 'bad'}">Signup status API — HTTP ${escapeHtml(String(signup.status ?? '—'))}${signup.body && typeof signup.body === 'object' && /** @type {Record<string, unknown>} */ (signup.body).enabled === true ? ' · signup enabled' : ''}</li>
      </ul>
    </section>
  `;
}

/**
 * @param {Record<string, unknown>} automation
 * @param {Record<string, string | null>} links
 */
function renderAutomationPanel(automation, links) {
  if (!automation.ok) {
    return `
      <section class="panel monitoring-panel">
        <div class="panel-head">
          <h2>GitHub automation</h2>
          ${renderLinkChip('Actions', links.githubActions)}
        </div>
        <p class="muted">${escapeHtml(String(automation.message ?? automation.error ?? 'GitHub automation not configured'))}</p>
      </section>
    `;
  }

  const runs = Array.isArray(automation.runs) ? automation.runs.slice(0, 5) : [];
  return `
    <section class="panel monitoring-panel">
      <div class="panel-head">
        <h2>GitHub automation</h2>
        ${renderLinkChip('Actions', links.githubActions)}
      </div>
      ${
        runs.length
          ? `<ul class="monitoring-list">${runs
              .map((run) => {
                const row = /** @type {Record<string, unknown>} */ (run);
                const tone = row.conclusion === 'success' ? 'ok' : row.status === 'in_progress' ? 'warn' : 'bad';
                return `<li class="${tone}">${escapeHtml(String(row.displayTitle ?? row.name ?? 'workflow'))} — ${escapeHtml(String(row.status ?? ''))}${row.conclusion ? ` (${escapeHtml(String(row.conclusion))})` : ''}</li>`;
              })
              .join('')}</ul>`
          : '<p class="muted">No recent workflow runs returned.</p>'
      }
    </section>
  `;
}

/**
 * @param {Record<string, unknown>[]} hubs
 */
function renderHubHealthTable(hubs) {
  if (!hubs.length) {
    return '<p class="muted">No sites in manifest.</p>';
  }

  const rows = [...hubs].sort((a, b) => String(a.siteId).localeCompare(String(b.siteId)));

  return `
    <div class="monitoring-table-wrap">
      <table class="monitoring-table">
        <thead>
          <tr>
            <th>Site</th>
            <th>Status</th>
            <th>Checks</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map((hub) => {
              const evaluation = /** @type {Record<string, unknown>} */ (hub.evaluation ?? {});
              const checks = Array.isArray(evaluation.checks) ? evaluation.checks : [];
              const status = String(evaluation.status ?? 'unknown');
              const flags = [
                hub.protected ? 'protected' : null,
                hub.terraform ? 'terraform' : null,
                evaluation.publicDemo ? 'public demo' : null
              ].filter(Boolean);

              return `
                <tr>
                  <td>
                    <strong>${escapeHtml(String(hub.siteId))}</strong>
                    <div class="muted monitoring-sub">${escapeHtml(String(hub.hostname ?? ''))}</div>
                  </td>
                  <td><span class="status-pill status-${escapeHtml(status)}">${escapeHtml(statusLabel(status))}</span></td>
                  <td>
                    <ul class="health-list health-list-compact">
                      ${checks
                        .map((check) => {
                          const row = /** @type {Record<string, unknown>} */ (check);
                          const cls = row.ok ? 'ok' : row.id === 'access-probe' ? 'warn' : 'bad';
                          return `<li class="${cls}">${escapeHtml(String(row.label ?? ''))}</li>`;
                        })
                        .join('')}
                    </ul>
                  </td>
                  <td class="muted">${flags.map((flag) => escapeHtml(String(flag))).join(' · ') || '—'}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * @param {unknown} value
 */
function formatTime(value) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });
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
