import { fetchSiteAccessProbe, fetchSiteHealth, fetchSites } from './api.js';

const main = document.getElementById('main');
const refreshBtn = document.getElementById('refresh-btn');

refreshBtn?.addEventListener('click', () => {
  render().catch(showError);
});

render().catch(showError);

async function render() {
  if (!main) return;
  main.innerHTML = '<p class="muted">Loading sites…</p>';
  const data = await fetchSites();
  const sites = Object.values(data.sites ?? {}).sort((a, b) =>
    String(a.siteId).localeCompare(String(b.siteId))
  );

  main.innerHTML = `
    <p class="meta">Manifest: ${escapeHtml(data.generatedAt ?? 'unknown')} · signed in as ${escapeHtml(data.operator ?? '—')}</p>
    <section class="grid">
      ${sites.map((site) => renderSiteCard(site)).join('')}
    </section>
    <section class="panel new-site">
      <h2>Add a site</h2>
      <ol>
        <li>Add entry to <code>platform/sites.yaml</code> and <code>terraform/environments/*.tfvars</code></li>
        <li><code>terraform apply</code> (new) or <code>scripts/terraform-import-hub-site.sh</code> (existing)</li>
        <li>Sync Wrangler, deploy Worker, set secrets — see <code>docs/platform-terraform.md</code></li>
        <li>Rebuild manifest: <code>npm run platform:manifest</code></li>
      </ol>
    </section>
  `;

  main.querySelectorAll('[data-check-site]').forEach((button) => {
    button.addEventListener('click', async () => {
      const siteId = button.getAttribute('data-check-site');
      if (!siteId) return;
      const row = main.querySelector(`[data-health-row="${siteId}"]`);
      if (row) row.textContent = 'Checking…';
      const [health, probe] = await Promise.all([
        fetchSiteHealth(siteId),
        fetchSiteAccessProbe(siteId)
      ]);
      if (row) {
        row.innerHTML = renderHealthSummary(health, probe);
      }
    });
  });
}

/**
 * @param {Record<string, unknown>} site
 */
function renderSiteCard(site) {
  const tfBadge = site.terraform
    ? '<span class="badge badge-ok">terraform</span>'
    : '<span class="badge badge-warn">manual</span>';
  const envBadge = `<span class="badge">${escapeHtml(String(site.hubEnvironment))}</span>`;
  const contract = site.contract ? '<span class="badge badge-ok">in state</span>' : '';

  return `
    <article class="card">
      <header class="card-head">
        <h2>${escapeHtml(String(site.siteId))}</h2>
        <div class="badges">${envBadge}${tfBadge}${contract}</div>
      </header>
      <dl class="facts">
        <div><dt>Hostname</dt><dd><a href="${escapeHtml(String(site.pagesUrl))}" target="_blank" rel="noopener">${escapeHtml(String(site.hostname))}</a></dd></div>
        <div><dt>Pages</dt><dd><code>${escapeHtml(String(site.pagesProject))}</code></dd></div>
        <div><dt>Worker</dt><dd><code>${escapeHtml(String(site.workerName))}</code></dd></div>
      </dl>
      <div class="actions">
        <button type="button" class="btn btn-small" data-check-site="${escapeHtml(String(site.siteId))}">Check health</button>
        <a class="btn btn-small btn-ghost" href="${escapeHtml(String(site.pagesUrl))}" target="_blank" rel="noopener">Open site</a>
      </div>
      <div class="health" data-health-row="${escapeHtml(String(site.siteId))}"></div>
      ${renderProvisioning(site)}
    </article>
  `;
}

/**
 * @param {Record<string, unknown>} site
 */
function renderProvisioning(site) {
  const steps = Array.isArray(site.provisioning) ? site.provisioning : [];
  if (!steps.length) return '';
  const items = steps
    .map((step) => {
      const done = step.done === true ? 'done' : step.done === false ? 'todo' : 'unknown';
      return `<li class="${done}">${escapeHtml(String(step.label))}</li>`;
    })
    .join('');
  return `<ul class="checklist">${items}</ul>`;
}

/**
 * @param {Record<string, unknown>} health
 * @param {Record<string, unknown>} probe
 */
function renderHealthSummary(health, probe) {
  if (health.needsServiceAuth || probe.needsServiceAuth) {
    const hint = health.hint ?? probe.hint ?? 'Run terraform apply to enable platform health checks.';
    return `<ul class="health-list"><li class="warn">${escapeHtml(hint)}</li></ul>`;
  }

  const workerOk = health.ok && health.body?.status === 'ok';
  const bindingOk = probe.body?.usesHubApiBinding === true;
  const accessOk = probe.body?.canForwardJwt === true || probe.body?.middlewareAccessValidated === true;
  const workerLabel =
    health.error === 'ACCESS_BLOCKED' ? 'blocked by Access' : workerOk ? 'OK' : 'fail';
  return `
    <ul class="health-list">
      <li class="${workerOk ? 'ok' : 'bad'}">Worker /api/health ${workerLabel}</li>
      <li class="${bindingOk ? 'ok' : 'bad'}">HUB_API binding ${bindingOk ? 'yes' : 'no'}</li>
      <li class="${accessOk ? 'ok' : 'warn'}">Access probe ${accessOk ? 'OK' : 'check Pages env'}</li>
    </ul>
  `;
}

/**
 * @param {unknown} error
 */
function showError(error) {
  if (!main) return;
  main.innerHTML = `<div class="error">${escapeHtml(error instanceof Error ? error.message : String(error))}</div>`;
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
