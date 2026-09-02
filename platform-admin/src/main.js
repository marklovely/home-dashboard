import { fetchMarketingAccess, fetchSiteAccessProbe, fetchSiteHealth, fetchSitePreviewStatus, fetchSites, fetchSiteUsage, fetchUsageSummary, setSitePreviewEnabled, startBillingCheckout } from './api.js';
import { renderStripeModePanel, wireStripeModePanel } from './stripeMode.js';
import { renderSiteBilling } from './billing.js';
import {
  evaluateSiteHealth,
  mergeProvisioningWithHealth,
  renderHealthSummary,
  statusLabel
} from './health.js';
import {
  MANIFEST_CONTRACT_MISSING_HINT,
  MANIFEST_CONTRACT_MISSING_MESSAGE,
  siteMissingManifestContract
} from '../../functions/api/platform/manifestContractCopy.js';
import {
  renderAccountUsageSummary,
  renderSiteUsageSummary
} from './usage.js';
import {
  renderCopyCommand,
  renderLinkChip,
  siteDashboardLinks,
  siteOperatorCommands
} from './links.js';
import { confirmDeployWorker, confirmProvisionSite, openSiteWizard } from './wizard.js';
import { renderMarketingAccessPanel, wireMarketingAccessPanel } from './marketingAccess.js';

const main = document.getElementById('main');
const refreshBtn = document.getElementById('refresh-btn');
const checkAllBtn = document.getElementById('check-all-btn');
const checkAllUsageBtn = document.getElementById('check-all-usage-btn');
const addSiteBtn = document.getElementById('add-site-btn');
const summaryEl = document.getElementById('summary');

/** @type {Map<string, Record<string, unknown>>} */
const sitesById = new Map();

/** @type {Map<string, { status: string, result: ReturnType<typeof evaluateSiteHealth> }>} */
const healthBySite = new Map();

/** @type {Map<string, Record<string, unknown>>} */
const usageBySite = new Map();

/** @type {Map<string, Record<string, unknown>>} */
const previewsBySite = new Map();

/** @type {Record<string, unknown> | null} */
let accountUsageSummary = null;

refreshBtn?.addEventListener('click', () => {
  healthBySite.clear();
  usageBySite.clear();
  previewsBySite.clear();
  accountUsageSummary = null;
  render().catch(showError);
});

checkAllBtn?.addEventListener('click', () => {
  runAllHealthChecks().catch(showError);
});

checkAllUsageBtn?.addEventListener('click', () => {
  runAllUsageChecks().catch(showError);
});

addSiteBtn?.addEventListener('click', () => {
  openSiteWizard({
    mode: 'create',
    githubConfigured: addSiteBtn.getAttribute('data-github-configured') === 'true',
    onComplete: () => render().catch(showError)
  }).catch(showError);
});

render().catch(showError);

async function render() {
  if (!main) return;
  main.innerHTML = '<p class="muted">Loading sites…</p>';
  const data = await fetchSites();
  const platform = data.platform ?? {};
  const sites = Object.values(data.sites ?? {}).sort((a, b) =>
    String(a.siteId).localeCompare(String(b.siteId))
  );
  sitesById.clear();
  for (const site of sites) {
    sitesById.set(String(site.siteId), site);
  }

  updateSummary(sites, data.healthServiceAuthConfigured, data.cloudflareUsageConfigured);
  addSiteBtn?.setAttribute(
    'data-github-configured',
    data.githubAutomationConfigured === true ? 'true' : 'false'
  );
  main.setAttribute('data-cloudflare-pages-configured', data.cloudflarePagesConfigured === true ? 'true' : 'false');

  main.innerHTML = `
    ${data.healthServiceAuthConfigured === false ? '<div class="banner banner-warn">Health checks need <code>PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID</code> and <code>PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET</code> on the platform Pages project. Run <code>terraform apply -var-file=environments/hub.tfvars</code>.</div>' : ''}
    ${data.cloudflareUsageConfigured === false ? '<div class="banner banner-warn">Storage usage needs <code>PLATFORM_CF_API_TOKEN</code> (Account → Workers R2 Storage → Read) and <code>CLOUDFLARE_ACCOUNT_ID</code> on the platform Pages project.</div>' : ''}
    ${data.cloudflarePagesConfigured === false ? '<div class="banner banner-warn">PR preview toggles need <code>PLATFORM_CF_API_TOKEN</code> (Account → Cloudflare Pages → Edit) and <code>CLOUDFLARE_ACCOUNT_ID</code> on the platform Pages project.</div>' : ''}
    ${data.githubAutomationConfigured === false ? '<div class="banner banner-warn">Site wizard needs <code>PLATFORM_GITHUB_TOKEN</code> (contents:write, actions:write, plus Variables write) and <code>PLATFORM_GITHUB_REPO</code> on the platform Pages project.</div>' : ''}
    <p class="meta">Manifest ${escapeHtml(formatManifestTime(data.generatedAt))} · signed in as ${escapeHtml(data.operator ?? '—')}</p>
    <div id="stripe-mode-slot"></div>
    <div id="marketing-access-slot"></div>
    <section class="grid">
      ${sites.map((site) => renderSiteCard(site, platform, data.githubAutomationConfigured === true, data.cloudflarePagesConfigured === true, data.billingBySite ?? {}, { stripeConfigured: data.stripeBillingConfigured === true, billingDbConfigured: data.platformBillingDbConfigured === true })).join('')}
    </section>
    <section class="panel new-site">
      <h2>Site automation</h2>
      <p class="muted">Add sites via wizard → merge PR → provisioning runs automatically on <code>main</code> (Terraform, Worker, Pages, manifest). Or click <strong>Provision</strong> on a site card to retry.</p>
      <p class="muted">Requires remote Terraform state and GitHub secrets — see <code>docs/platform-provision.md</code>.</p>
    </section>
  `;

  main.setAttribute('data-platform', JSON.stringify(platform));
  wireSiteActions(sites, data.githubAutomationConfigured === true, data.cloudflarePagesConfigured === true, data.billingBySite ?? {});
  loadStripeModePanel(data.stripeMode, data.platformBillingDbConfigured === true);
  await loadMarketingAccessPanel();

  if (data.healthServiceAuthConfigured && healthBySite.size === 0) {
    runAllHealthChecks().catch(showError);
  }

  if (data.cloudflarePagesConfigured) {
    runAllPreviewChecks(sites).catch(showError);
  }
}

/**
 * @param {Record<string, unknown>[]} sites
 * @param {boolean | undefined} healthConfigured
 * @param {boolean | undefined} usageConfigured
 */
function updateSummary(sites, healthConfigured, usageConfigured) {
  if (!summaryEl) return;
  const terraformCount = sites.filter((s) => s.terraform).length;
  const checked = [...healthBySite.values()];
  const healthyCount = checked.filter((h) => h.status === 'healthy').length;
  const degradedCount = checked.filter((h) => h.status === 'degraded').length;

  summaryEl.innerHTML = `
    <span class="summary-item"><strong>${sites.length}</strong> sites</span>
    <span class="summary-item"><strong>${terraformCount}</strong> in Terraform</span>
    <span class="summary-item">${healthConfigured ? `<strong>${healthyCount}</strong> healthy${degradedCount ? ` · <strong>${degradedCount}</strong> degraded` : ''}` : 'Health auth not configured'}</span>
    ${usageConfigured ? renderAccountUsageSummary(accountUsageSummary ?? { ok: false, message: 'Click Check all usage' }) : '<span class="summary-item usage-muted">Storage usage not configured</span>'}
  `;
}

/**
 * @param {Record<string, unknown>[]} sites
 * @param {boolean} githubConfigured
 * @param {boolean} pagesConfigured
 * @param {Record<string, Record<string, unknown>>} billingBySite
 */
function wireSiteActions(sites, githubConfigured, pagesConfigured, billingBySite) {
  main.querySelectorAll('[data-check-site]').forEach((button) => {
    button.addEventListener('click', async () => {
      const siteId = button.getAttribute('data-check-site');
      if (!siteId) return;
      await checkSiteHealth(siteId);
    });
  });

  main.querySelectorAll('[data-check-usage]').forEach((button) => {
    button.addEventListener('click', async () => {
      const siteId = button.getAttribute('data-check-usage');
      if (!siteId) return;
      await checkSiteUsage(siteId);
    });
  });

  main.querySelectorAll('[data-edit-site]').forEach((button) => {
    button.addEventListener('click', () => {
      const siteId = button.getAttribute('data-edit-site');
      const site = sites.find((row) => String(row.siteId) === siteId);
      if (!site) return;
      openSiteWizard({
        mode: 'update',
        site,
        githubConfigured,
        onComplete: () => render().catch(showError)
      }).catch(showError);
    });
  });

  main.querySelectorAll('[data-delete-site]').forEach((button) => {
    button.addEventListener('click', () => {
      const siteId = button.getAttribute('data-delete-site');
      const site = sites.find((row) => String(row.siteId) === siteId);
      if (!site) return;
      openSiteWizard({
        mode: 'delete',
        site,
        githubConfigured,
        onComplete: () => render().catch(showError)
      }).catch(showError);
    });
  });

  main.querySelectorAll('[data-provision-site]').forEach((button) => {
    button.addEventListener('click', () => {
      const siteId = button.getAttribute('data-provision-site');
      if (!siteId) return;
      confirmProvisionSite(siteId, () => render().catch(showError)).catch(showError);
    });
  });

  main.querySelectorAll('[data-deploy-site]').forEach((button) => {
    button.addEventListener('click', () => {
      const siteId = button.getAttribute('data-deploy-site');
      if (!siteId) return;
      confirmDeployWorker(siteId, () => render().catch(showError)).catch(showError);
    });
  });

  main.querySelectorAll('[data-preview-toggle]').forEach((input) => {
    input.addEventListener('change', async () => {
      const siteId = input.getAttribute('data-preview-toggle');
      if (!siteId || !pagesConfigured) return;
      const checkbox = /** @type {HTMLInputElement} */ (input);
      const enabled = checkbox.checked;
      checkbox.disabled = true;
      try {
        const result = await setSitePreviewEnabled(siteId, enabled);
        previewsBySite.set(siteId, result);
        updatePreviewRow(siteId, result);
      } catch (error) {
        checkbox.checked = !enabled;
        showError(error);
      } finally {
        checkbox.disabled = false;
      }
    });
  });

  main.querySelectorAll('[data-billing-checkout]').forEach((button) => {
    button.addEventListener('click', async () => {
      const siteId = button.getAttribute('data-billing-checkout');
      if (!siteId) return;
      const site = sites.find((row) => String(row.siteId) === siteId);
      const billing = billingBySite[siteId];
      const defaultEmail =
        (billing?.owner_email ? String(billing.owner_email) : '') ||
        (Array.isArray(site?.ownerEmails) && site.ownerEmails[0] ? String(site.ownerEmails[0]) : '');
      const customerEmail = window.prompt('Customer email for Stripe checkout:', defaultEmail);
      if (!customerEmail) return;
      button.setAttribute('disabled', 'true');
      try {
        const result = await startBillingCheckout(siteId, customerEmail.trim());
        if (result.url) {
          window.open(String(result.url), '_blank', 'noopener,noreferrer');
        } else {
          throw new Error('Checkout did not return a Stripe URL.');
        }
      } catch (error) {
        showError(error);
      } finally {
        button.removeAttribute('disabled');
      }
    });
  });

  main.querySelectorAll('[data-copy]').forEach((button) => {
    button.addEventListener('click', async () => {
      const value = button.getAttribute('data-copy');
      const label = button.getAttribute('data-copy-label') ?? 'Copy';
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        button.textContent = 'Copied';
        setTimeout(() => {
          button.textContent = label;
        }, 1200);
      } catch {
        /* ignore */
      }
    });
  });
}

async function runAllPreviewChecks(sites) {
  await Promise.all(
    sites.map(async (site) => {
      const siteId = String(site.siteId);
      await checkSitePreview(siteId);
    })
  );
}

/**
 * @param {string} siteId
 */
async function checkSitePreview(siteId) {
  const row = main.querySelector(`[data-preview-row="${siteId}"]`);
  const checkbox = main.querySelector(`[data-preview-toggle="${siteId}"]`);
  if (row) row.textContent = 'Checking previews…';

  const status = await fetchSitePreviewStatus(siteId);
  previewsBySite.set(siteId, status);
  updatePreviewRow(siteId, status);

  if (checkbox && status.ok) {
    /** @type {HTMLInputElement} */ (checkbox).checked = status.enabled === true;
  }
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown>} status
 */
function updatePreviewRow(siteId, status) {
  const row = main.querySelector(`[data-preview-row="${siteId}"]`);
  const checkbox = main.querySelector(`[data-preview-toggle="${siteId}"]`);
  if (!row) return;

  if (!status.ok) {
    row.innerHTML = `<span class="preview-muted">${escapeHtml(String(status.message ?? 'Preview status unavailable'))}</span>`;
    if (checkbox) /** @type {HTMLInputElement} */ (checkbox).disabled = true;
    return;
  }

  row.innerHTML = status.enabled
    ? '<span class="preview-on">PR previews enabled</span>'
    : '<span class="preview-off">PR previews disabled</span>';
  if (checkbox) /** @type {HTMLInputElement} */ (checkbox).disabled = false;
}

async function runAllHealthChecks() {
  const buttons = main.querySelectorAll('[data-check-site]');
  checkAllBtn?.setAttribute('disabled', 'true');
  try {
    await Promise.all(
      [...buttons].map(async (button) => {
        const siteId = button.getAttribute('data-check-site');
        if (!siteId) return;
        await checkSiteHealth(siteId);
      })
    );
  } finally {
    checkAllBtn?.removeAttribute('disabled');
  }
}

/**
 * @param {string} siteId
 */
async function checkSiteHealth(siteId) {
  const row = main.querySelector(`[data-health-row="${siteId}"]`);
  const statusEl = main.querySelector(`[data-status-dot="${siteId}"]`);
  const checklistEl = main.querySelector(`[data-checklist="${siteId}"]`);
  if (row) row.textContent = 'Checking…';

  const [health, probe] = await Promise.all([fetchSiteHealth(siteId), fetchSiteAccessProbe(siteId)]);
  const result = evaluateSiteHealth(health, probe, sitesById.get(siteId));
  healthBySite.set(siteId, { status: result.status, result });

  if (row) row.innerHTML = renderHealthSummary(result);
  if (statusEl) {
    statusEl.className = `status-dot status-${result.status}`;
    statusEl.setAttribute('title', statusLabel(result.status));
  }

  if (checklistEl) {
    const steps = JSON.parse(checklistEl.getAttribute('data-steps') ?? '[]');
    const merged = mergeProvisioningWithHealth(steps, result);
    checklistEl.innerHTML = renderProvisioningList(merged);
  }

  const data = await fetchSites().catch(() => null);
  if (data) {
    updateSummary(Object.values(data.sites ?? {}), data.healthServiceAuthConfigured, data.cloudflareUsageConfigured);
  }
}

async function runAllUsageChecks() {
  checkAllUsageBtn?.setAttribute('disabled', 'true');
  try {
    accountUsageSummary = await fetchUsageSummary();
    const buttons = main.querySelectorAll('[data-check-usage]');
    await Promise.all(
      [...buttons].map(async (button) => {
        const siteId = button.getAttribute('data-check-usage');
        if (!siteId) return;
        await checkSiteUsage(siteId, { skipSummaryRefresh: true });
      })
    );
    const data = await fetchSites().catch(() => null);
    if (data) {
      updateSummary(Object.values(data.sites ?? {}), data.healthServiceAuthConfigured, data.cloudflareUsageConfigured);
    }
  } finally {
    checkAllUsageBtn?.removeAttribute('disabled');
  }
}

/**
 * @param {string} siteId
 * @param {{ skipSummaryRefresh?: boolean }} [options]
 */
async function checkSiteUsage(siteId, options = {}) {
  const row = main.querySelector(`[data-usage-row="${siteId}"]`);
  if (row) row.textContent = 'Checking storage…';

  const usage = await fetchSiteUsage(siteId);
  usageBySite.set(siteId, usage);

  if (row) row.innerHTML = renderSiteUsageSummary(usage);

  if (!options.skipSummaryRefresh) {
    accountUsageSummary = await fetchUsageSummary().catch(() => accountUsageSummary);
    const data = await fetchSites().catch(() => null);
    if (data) {
      updateSummary(Object.values(data.sites ?? {}), data.healthServiceAuthConfigured, data.cloudflareUsageConfigured);
    }
  }
}

/**
 * @param {Record<string, unknown>} site
 * @param {Record<string, unknown>} platform
 * @param {boolean} githubConfigured
 * @param {boolean} pagesConfigured
 * @param {Record<string, Record<string, unknown>>} billingBySite
 * @param {{ stripeConfigured: boolean; billingDbConfigured: boolean }} billingOptions
 */
function renderSiteCard(site, platform, githubConfigured, pagesConfigured, billingBySite, billingOptions) {
  const siteId = String(site.siteId);
  const isProduction = siteId === 'production';
  const stored = healthBySite.get(siteId);
  const storedUsage = usageBySite.get(siteId);
  const storedPreview = previewsBySite.get(siteId);
  const tfBadge = site.terraform
    ? '<span class="badge badge-ok">terraform</span>'
    : '<span class="badge badge-warn">manual</span>';
  const envBadge = `<span class="badge">${escapeHtml(String(site.hubEnvironment))}</span>`;
  const contract = site.contract ? '<span class="badge badge-ok">in state</span>' : '';
  const links = siteDashboardLinks(platform, site);
  const commands = siteOperatorCommands(site);
  const steps = Array.isArray(site.provisioning) ? site.provisioning : [];
  const attachPending = site.attachHubApiBinding !== true;
  const hubHealthy = stored?.status === 'healthy';
  const needsProvision =
    site.terraform && !isProduction && (!site.contract || attachPending) && !hubHealthy;
  const manifestContractMissing = siteMissingManifestContract(site);

  return `
    <article class="card">
      <header class="card-head">
        <div class="card-title">
          <span class="status-dot status-${stored?.status ?? 'unknown'}" data-status-dot="${escapeHtml(siteId)}" title="${escapeHtml(statusLabel(stored?.status ?? 'unknown'))}"></span>
          <h2>${escapeHtml(siteId)}</h2>
        </div>
        <div class="badges">${envBadge}${tfBadge}${contract}</div>
      </header>
      <dl class="facts">
        <div><dt>Hostname</dt><dd><a href="${escapeHtml(String(site.pagesUrl))}" target="_blank" rel="noopener">${escapeHtml(String(site.hostname))}</a></dd></div>
        <div><dt>Pages</dt><dd><code>${escapeHtml(String(site.pagesProject))}</code></dd></div>
        <div><dt>Worker</dt><dd><code>${escapeHtml(String(site.workerName))}</code></dd></div>
      </dl>
      ${renderSiteBilling(site, billingBySite[siteId] ?? null, { ...billingOptions, hubHealthy })}
      ${
        manifestContractMissing
          ? `<div class="banner banner-warn site-manifest-banner">${escapeHtml(MANIFEST_CONTRACT_MISSING_MESSAGE)} ${escapeHtml(MANIFEST_CONTRACT_MISSING_HINT)}</div>`
          : ''
      }
      <div class="link-row">
        ${renderLinkChip('Cloudflare Pages', links.pages)}
        ${renderLinkChip('Worker', links.worker)}
        ${renderLinkChip('D1', links.d1)}
        ${renderLinkChip('Access apps', links.access)}
        ${renderLinkChip('GitHub', links.github)}
      </div>
      <div class="link-row">
        ${renderCopyCommand('Copy deploy', commands.workerDeploy)}
        ${renderCopyCommand('Copy sync', commands.syncWrangler)}
      </div>
      <div class="preview-row">
        ${pagesConfigured && site.terraform && !isProduction
          ? `<label class="preview-toggle">
              <input type="checkbox" data-preview-toggle="${escapeHtml(siteId)}" ${storedPreview?.enabled ? 'checked' : ''} />
              <span>PR preview builds</span>
            </label>`
          : ''}
        <span class="preview-status" data-preview-row="${escapeHtml(siteId)}">${storedPreview ? renderPreviewSummary(storedPreview) : ''}</span>
      </div>
      <div class="actions">
        <button type="button" class="btn btn-small" data-check-site="${escapeHtml(siteId)}">Check health</button>
        <button type="button" class="btn btn-small btn-ghost" data-check-usage="${escapeHtml(siteId)}">Check usage</button>
        ${githubConfigured ? `<button type="button" class="btn btn-small btn-ghost" data-edit-site="${escapeHtml(siteId)}">Edit</button>` : ''}
        ${githubConfigured && !isProduction ? `<button type="button" class="btn btn-small btn-ghost" data-delete-site="${escapeHtml(siteId)}">Delete</button>` : ''}
        ${githubConfigured && needsProvision ? `<button type="button" class="btn btn-small" data-provision-site="${escapeHtml(siteId)}">Provision</button>` : ''}
        ${githubConfigured && !isProduction ? `<button type="button" class="btn btn-small btn-ghost" data-deploy-site="${escapeHtml(siteId)}">Deploy Worker</button>` : ''}
        <a class="btn btn-small btn-ghost" href="${escapeHtml(String(site.pagesUrl))}/api/access-probe" target="_blank" rel="noopener">Access probe</a>
        <a class="btn btn-small btn-ghost" href="${escapeHtml(String(site.pagesUrl))}" target="_blank" rel="noopener">Open site</a>
      </div>
      <div class="health" data-health-row="${escapeHtml(siteId)}">${stored ? renderHealthSummary(stored.result) : ''}</div>
      <div class="usage" data-usage-row="${escapeHtml(siteId)}">${storedUsage ? renderSiteUsageSummary(storedUsage) : ''}</div>
      <ul class="checklist" data-checklist="${escapeHtml(siteId)}" data-steps="${escapeAttr(JSON.stringify(steps))}">
        ${renderProvisioningList(steps)}
      </ul>
    </article>
  `;
}

function renderPreviewSummary(status) {
  if (!status.ok) {
    return `<span class="preview-muted">${escapeHtml(String(status.message ?? 'Preview status unavailable'))}</span>`;
  }
  return status.enabled
    ? '<span class="preview-on">PR previews enabled</span>'
    : '<span class="preview-off">PR previews disabled</span>';
}

/**
 * @param {Record<string, unknown>[]} steps
 */
function renderProvisioningList(steps) {
  if (!steps.length) return '';
  return steps
    .map((step) => {
      const done = step.done === true ? 'done' : step.done === false ? 'todo' : 'unknown';
      return `<li class="${done}">${escapeHtml(String(step.label))}</li>`;
    })
    .join('');
}

/**
 * @param {Record<string, unknown> | null | undefined} stripe
 * @param {boolean} billingDbConfigured
 */
function loadStripeModePanel(stripe, billingDbConfigured) {
  const slot = document.getElementById('stripe-mode-slot');
  if (!slot) return;
  slot.innerHTML = renderStripeModePanel(stripe, billingDbConfigured);
  wireStripeModePanel(showError, () => render(), stripe);
}

async function loadMarketingAccessPanel() {
  const slot = document.getElementById('marketing-access-slot');
  if (!slot) return;
  slot.innerHTML = '<section class="panel marketing-access"><p class="muted">Loading marketing access…</p></section>';
  try {
    const data = await fetchMarketingAccess();
    slot.innerHTML = renderMarketingAccessPanel(data);
    wireMarketingAccessPanel(showError, loadMarketingAccessPanel);
  } catch (error) {
    slot.innerHTML = renderMarketingAccessPanel({
      ok: false,
      message: error instanceof Error ? error.message : 'Could not load marketing access.'
    });
  }
}

/**
 * @param {unknown} generatedAt
 */
function formatManifestTime(generatedAt) {
  if (!generatedAt) return 'unknown';
  const date = new Date(String(generatedAt));
  if (Number.isNaN(date.getTime())) return String(generatedAt);
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * @param {unknown} error
 */
function showError(error) {
  if (!main) return;
  main.innerHTML = `<div class="banner banner-error">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
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

/**
 * @param {string} value
 */
function escapeAttr(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}
