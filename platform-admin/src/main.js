import { fetchSiteAccessProbe, fetchSiteHealth, fetchSites } from './api.js';
import {
  evaluateSiteHealth,
  mergeProvisioningWithHealth,
  renderHealthSummary,
  statusLabel
} from './health.js';
import {
  renderCopyCommand,
  renderLinkChip,
  siteDashboardLinks,
  siteOperatorCommands
} from './links.js';
import { confirmDeployWorker, confirmProvisionSite, openSiteWizard } from './wizard.js';

const main = document.getElementById('main');
const refreshBtn = document.getElementById('refresh-btn');
const checkAllBtn = document.getElementById('check-all-btn');
const addSiteBtn = document.getElementById('add-site-btn');
const summaryEl = document.getElementById('summary');

/** @type {Map<string, { status: string, result: ReturnType<typeof evaluateSiteHealth> }>} */
const healthBySite = new Map();

refreshBtn?.addEventListener('click', () => {
  healthBySite.clear();
  render().catch(showError);
});

checkAllBtn?.addEventListener('click', () => {
  runAllHealthChecks().catch(showError);
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

  updateSummary(sites, data.healthServiceAuthConfigured);
  addSiteBtn?.setAttribute(
    'data-github-configured',
    data.githubAutomationConfigured === true ? 'true' : 'false'
  );

  main.innerHTML = `
    ${data.healthServiceAuthConfigured === false ? '<div class="banner banner-warn">Health checks need <code>PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID</code> and <code>PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET</code> on the platform Pages project. Run <code>terraform apply -var-file=environments/hub.tfvars</code>.</div>' : ''}
    ${data.githubAutomationConfigured === false ? '<div class="banner banner-warn">Site wizard needs <code>PLATFORM_GITHUB_TOKEN</code> (contents:write, actions:write) and <code>PLATFORM_GITHUB_REPO</code> on the platform Pages project.</div>' : ''}
    <p class="meta">Manifest ${escapeHtml(formatManifestTime(data.generatedAt))} · signed in as ${escapeHtml(data.operator ?? '—')}</p>
    <section class="grid">
      ${sites.map((site) => renderSiteCard(site, platform, data.githubAutomationConfigured === true)).join('')}
    </section>
    <section class="panel new-site">
      <h2>Site automation</h2>
      <p class="muted">Add sites via wizard → merge PR → provisioning runs automatically on <code>main</code> (Terraform, Worker, Pages, manifest). Or click <strong>Provision</strong> on a site card to retry.</p>
      <p class="muted">Requires remote Terraform state and GitHub secrets — see <code>docs/platform-provision.md</code>.</p>
    </section>
  `;

  main.setAttribute('data-platform', JSON.stringify(platform));
  wireSiteActions(sites, data.githubAutomationConfigured === true);

  if (data.healthServiceAuthConfigured && healthBySite.size === 0) {
    runAllHealthChecks().catch(showError);
  }
}

/**
 * @param {Record<string, unknown>[]} sites
 * @param {boolean | undefined} healthConfigured
 */
function updateSummary(sites, healthConfigured) {
  if (!summaryEl) return;
  const terraformCount = sites.filter((s) => s.terraform).length;
  const checked = [...healthBySite.values()];
  const healthyCount = checked.filter((h) => h.status === 'healthy').length;
  const degradedCount = checked.filter((h) => h.status === 'degraded').length;

  summaryEl.innerHTML = `
    <span class="summary-item"><strong>${sites.length}</strong> sites</span>
    <span class="summary-item"><strong>${terraformCount}</strong> in Terraform</span>
    <span class="summary-item">${healthConfigured ? `<strong>${healthyCount}</strong> healthy${degradedCount ? ` · <strong>${degradedCount}</strong> degraded` : ''}` : 'Health auth not configured'}</span>
  `;
}

/**
 * @param {Record<string, unknown>[]} sites
 * @param {boolean} githubConfigured
 */
function wireSiteActions(sites, githubConfigured) {
  main.querySelectorAll('[data-check-site]').forEach((button) => {
    button.addEventListener('click', async () => {
      const siteId = button.getAttribute('data-check-site');
      if (!siteId) return;
      await checkSiteHealth(siteId);
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
  const result = evaluateSiteHealth(health, probe);
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
    updateSummary(Object.values(data.sites ?? {}), data.healthServiceAuthConfigured);
  }
}

/**
 * @param {Record<string, unknown>} site
 * @param {Record<string, unknown>} platform
 * @param {boolean} githubConfigured
 */
function renderSiteCard(site, platform, githubConfigured) {
  const siteId = String(site.siteId);
  const isProduction = siteId === 'production';
  const stored = healthBySite.get(siteId);
  const tfBadge = site.terraform
    ? '<span class="badge badge-ok">terraform</span>'
    : '<span class="badge badge-warn">manual</span>';
  const envBadge = `<span class="badge">${escapeHtml(String(site.hubEnvironment))}</span>`;
  const contract = site.contract ? '<span class="badge badge-ok">in state</span>' : '';
  const links = siteDashboardLinks(platform, site);
  const commands = siteOperatorCommands(site);
  const steps = Array.isArray(site.provisioning) ? site.provisioning : [];
  const needsProvision = site.terraform && !site.contract && !isProduction;

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
      <div class="actions">
        <button type="button" class="btn btn-small" data-check-site="${escapeHtml(siteId)}">Check health</button>
        ${githubConfigured ? `<button type="button" class="btn btn-small btn-ghost" data-edit-site="${escapeHtml(siteId)}">Edit</button>` : ''}
        ${githubConfigured && !isProduction ? `<button type="button" class="btn btn-small btn-ghost" data-delete-site="${escapeHtml(siteId)}">Delete</button>` : ''}
        ${githubConfigured && needsProvision ? `<button type="button" class="btn btn-small" data-provision-site="${escapeHtml(siteId)}">Provision</button>` : ''}
        ${githubConfigured && !isProduction ? `<button type="button" class="btn btn-small btn-ghost" data-deploy-site="${escapeHtml(siteId)}">Deploy Worker</button>` : ''}
        <a class="btn btn-small btn-ghost" href="${escapeHtml(String(site.pagesUrl))}/api/access-probe" target="_blank" rel="noopener">Access probe</a>
        <a class="btn btn-small btn-ghost" href="${escapeHtml(String(site.pagesUrl))}" target="_blank" rel="noopener">Open site</a>
      </div>
      <div class="health" data-health-row="${escapeHtml(siteId)}">${stored ? renderHealthSummary(stored.result) : ''}</div>
      <ul class="checklist" data-checklist="${escapeHtml(siteId)}" data-steps="${escapeAttr(JSON.stringify(steps))}">
        ${renderProvisioningList(steps)}
      </ul>
    </article>
  `;
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
