/**
 * @param {Record<string, unknown>} platform
 * @param {Record<string, unknown>} site
 * @returns {Record<string, string | null>}
 */
export function siteDashboardLinks(platform, site) {
  const accountId = String(platform.cloudflareAccountId ?? '').trim();
  const team = String(platform.accessTeamDomain ?? site.contract?.cf_access_team_domain ?? '').trim();
  const contract = /** @type {Record<string, unknown>} */ (site.contract ?? {});

  if (!accountId) {
    return {
      pages: null,
      worker: null,
      d1: null,
      access: team ? `https://one.dash.cloudflare.com/${team}/access/applications` : null,
      github: githubRepoUrl(platform)
    };
  }

  const pagesProject = String(site.pagesProject ?? '');
  const workerName = String(site.workerName ?? '');
  const d1Id = String(contract.d1_database_id ?? '');

  return {
    pages: pagesProject
      ? `https://dash.cloudflare.com/${accountId}/pages/view/${encodeURIComponent(pagesProject)}`
      : null,
    worker: workerName
      ? `https://dash.cloudflare.com/${accountId}/workers/services/view/${encodeURIComponent(workerName)}/production`
      : null,
    d1: d1Id ? `https://dash.cloudflare.com/${accountId}/workers/d1/databases/${d1Id}` : null,
    access: team ? `https://one.dash.cloudflare.com/${team}/access/applications` : null,
    github: githubRepoUrl(platform)
  };
}

/**
 * @param {Record<string, unknown>} platform
 * @param {Record<string, unknown>} site
 */
export function siteOperatorCommands(site) {
  const env = String(site.hubEnvironment ?? site.siteId ?? '');
  const workerDeploy =
    env === 'production' ? 'cd worker && npm run deploy' : `cd worker && npm run deploy:${env}`;
  return {
    workerDeploy,
    syncWrangler: `node scripts/sync-wrangler-from-terraform.mjs ${site.siteId}`,
    manifest: 'npm run platform:manifest',
    terraformApply: 'cd terraform && terraform apply -var-file=environments/hub.tfvars'
  };
}

/**
 * @param {Record<string, unknown>} platform
 */
function githubRepoUrl(platform) {
  const repo = String(platform.githubRepo ?? 'marklovely/home-dashboard').trim();
  if (!repo) return null;
  return repo.includes('/') ? `https://github.com/${repo}` : null;
}

/**
 * @param {string} label
 * @param {string | null} href
 */
export function renderLinkChip(label, href) {
  if (!href) return '';
  return `<a class="link-chip" href="${escapeAttr(href)}" target="_blank" rel="noopener">${escapeHtml(label)}</a>`;
}

/**
 * @param {string} command
 */
export function renderCopyCommand(label, command) {
  return `<button type="button" class="link-chip link-chip-copy" data-copy="${escapeAttr(command)}" data-copy-label="${escapeAttr(label)}">${escapeHtml(label)}</button>`;
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
  return escapeHtml(value);
}
