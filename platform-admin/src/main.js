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

const main = document.getElementById('main');
const refreshBtn = document.getElementById('refresh-btn');
const checkAllBtn = document.getElementById('check-all-btn');
const summaryEl = document.getElementById('summary');

/** @type {Map<string, { status: string, result: ReturnType<typeof evaluateSiteHealth> }>} */
const healthBySite = new Map();

refreshBtn?.addEventListener('click', () => {
  healthBySite.clear();
  render().catch(showError);
});

checkAllBtn?.addEventListener('click', () => {
  const platform = /** @type {Record<string, unknown>} */ (
    JSON.parse(main?.getAttribute('data-platform') ?? '{}')
  );
  runAllHealthChecks(platform).catch(showError);
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

  main.innerHTML = `
    ${data.healthServiceAuthConfigured === false ? '<div class="banner banner-warn">Health checks need <code>PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID</code> and <code>PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET</code> on the platform Pages project. Run <code>terraform apply -var-file=environments/hub.tfvars</code>.</div>' : ''}
    <p class="meta">Manifest ${escapeHtml(formatManifestTime(data.generatedAt))} · signed in as ${escapeHtml(data.operator ?? '—')}</p>
    <section class="grid">
      ${sites.map((site) => renderSiteCard(site, platform)).join('')}
    </section>
    <section class="panel new-site">
      <h2>Add a site</h2>
      <p class="muted">Registry: <code>platform/sites.yaml</code> · Infra: <code>terraform apply</code> · Full guide: <code>docs/platform-terraform.md</code></p>
      <ol>
        <li>Add entry to <code>platform/sites.yaml</code> and <code>terraform/environments/*.tfvars</code></li>
        <li><code>terraform apply</code> (new) or <code>scripts/terraform-import-hub-site.sh</code> (existing)</li>
        <li><code>node scripts/sync-wrangler-from-terraform.mjs &lt;site&gt;</code> then deploy Worker</li>
        <li><code>npm run platform:manifest</code> and redeploy platform admin if needed</li>
      </ol>
    </section>
  `;

  main.setAttribute('data-platform', JSON.stringify(platform));
  wireSiteActions(sites, platform);

  if (data.healthServiceAuthConfigured && healthBySite.size === 0) {
    runAllHealthChecks(platform).catch(showError);
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
 * @param {Record<string, unknown>} platform
 */
function wireSiteActions(sites, platform) {
  main.querySelectorAll('[data-check-site]').forEach((button) => {
    button.addEventListener('click', async () => {
      const siteId = button.getAttribute('data-check-site');
      if (!siteId) return;
      await checkSiteHealth(siteId, platform);
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

async function runAllHealthChecks(platform) {
  const buttons = main.querySelectorAll('[data-check-site]');
  checkAllBtn?.setAttribute('disabled', 'true');
  try {
    await Promise.all(
      [...buttons].map(async (button) => {
        const siteId = button.getAttribute('data-check-site');
        if (!siteId) return;
        await checkSiteHealth(siteId, platform);
      })
    );
  } finally {
    checkAllBtn?.removeAttribute('disabled');
  }
}

/**
 * @param {string} siteId
 * @param {Record<string, unknown>} platform
 */
async function checkSiteHealth(siteId, platform) {
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
 */
function renderSiteCard(site, platform) {
  const siteId = String(site.siteId);
  const stored = healthBySite.get(siteId);
  const tfBadge = site.terraform
    ? '<span class="badge badge-ok">terraform</span>'
    : '<span class="badge badge-warn">manual</span>';
  const envBadge = `<span class="badge">${escapeHtml(String(site.hubEnvironment))}</span>`;
  const contract = site.contract ? '<span class="badge badge-ok">in state</span>' : '';
  const links = siteDashboardLinks(platform, site);
  const commands = siteOperatorCommands(site);
  const steps = Array.isArray(site.provisioning) ? site.provisioning : [];

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
