import {
  createSite,
  deleteSite,
  deploySiteWorker,
  fetchWizardSchema,
  provisionSite,
  updateSite
} from './api.js';

/** @typedef {'create' | 'update' | 'delete'} WizardMode */

/** @typedef {object} WizardForm
 * @property {string} siteId
 * @property {string} hostname
 * @property {string} hubEnvironment
 * @property {boolean} vanilla
 * @property {boolean} attachHubApiBinding
 * @property {string} confirmHostname
 */

/**
 * @param {object} options
 * @param {WizardMode} options.mode
 * @param {Record<string, unknown> | null} [options.site]
 * @param {boolean} [options.githubConfigured]
 * @param {() => void | Promise<void>} [options.onComplete]
 */
export async function openSiteWizard({ mode, site = null, githubConfigured = false, onComplete }) {
  const schemaResponse = await fetchWizardSchema().catch(() => ({ schema: {} }));
  const schema = schemaResponse.schema ?? {};
  const zoneName = String(schema.zoneName ?? 'lovely-home.co.uk');
  const protectedIds = new Set(schema.protectedSiteIds ?? ['production']);

  /** @type {WizardForm} */
  const form = {
    siteId: site ? String(site.siteId) : '',
    hostname: site ? String(site.hostname) : '',
    hubEnvironment: site ? String(site.hubEnvironment ?? site.siteId) : '',
    vanilla: site ? Boolean(site.vanilla) : schema.defaults?.vanilla !== false,
    attachHubApiBinding: Boolean(site?.attachHubApiBinding ?? schema.defaults?.attachHubApiBinding),
    confirmHostname: ''
  };
  let hubEnvironmentCustom = mode === 'update' && form.hubEnvironment !== form.siteId;

  let step = 1;
  const overlay = document.createElement('div');
  overlay.className = 'wizard-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const panel = document.createElement('div');
  panel.className = 'wizard-panel';
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  const render = () => {
    panel.innerHTML = renderWizardStep(mode, step, form, {
      zoneName,
      protectedIds,
      githubConfigured,
      site,
      hubEnvironmentCustom
    });
    wireWizardStep(panel, form, mode, step, {
      zoneName,
      protectedIds,
      hubEnvironmentCustom,
      setHubEnvironmentCustom: (value) => {
        hubEnvironmentCustom = value;
      },
      onBack: () => {
        step = Math.max(1, step - 1);
        render();
      },
      onNext: () => {
        const error = validateStep(mode, step, form, { zoneName, protectedIds });
        if (error) {
          showWizardError(panel, error);
          return;
        }
        if (mode !== 'delete' && step === 1 && !hubEnvironmentCustom) {
          form.hubEnvironment = form.siteId;
        }
        if (mode === 'delete' && step === 1) {
          step = 2;
        } else if (step < totalSteps(mode)) {
          step += 1;
        }
        render();
      },
      onSubmit: async () => {
        const error = validateStep(mode, step, form, { zoneName, protectedIds });
        if (error) {
          showWizardError(panel, error);
          return;
        }
        await submitWizard(mode, form, panel, githubConfigured, onComplete, close);
      },
      onClose: close,
      onRerender: () => render()
    });
  };

  render();
}

/**
 * @param {WizardMode} mode
 */
function totalSteps(mode) {
  return mode === 'delete' ? 2 : 3;
}

/**
 * @param {WizardMode} mode
 * @param {number} step
 * @param {WizardForm} form
 * @param {object} ctx
 */
function renderWizardStep(mode, step, form, ctx) {
  const titles = {
    create: ['New site', 'Configuration', 'Review & submit'],
    update: ['Edit site', 'Configuration', 'Review & submit'],
    delete: ['Confirm deletion', 'Review & submit']
  };
  const title = titles[mode][step - 1] ?? 'Site wizard';

  let body = '';
  if (!ctx.githubConfigured) {
    body += `<div class="banner banner-warn">GitHub automation is not configured. Set <code>PLATFORM_GITHUB_TOKEN</code> and <code>PLATFORM_GITHUB_REPO</code> on the platform Pages project, then redeploy.</div>`;
  }

  if (mode === 'delete' && ctx.protectedIds.has(form.siteId)) {
    body += `<div class="banner banner-error">Site <code>${escapeHtml(form.siteId)}</code> is protected and cannot be deleted from the platform UI.</div>`;
  }

  if (step === 1 && mode !== 'delete') {
    body += `
      <label class="field">
        <span>Site id</span>
        <input type="text" name="siteId" value="${escapeAttr(form.siteId)}" ${mode === 'update' ? 'readonly' : ''} placeholder="demo" autocomplete="off" />
        <small class="muted">Lowercase letters, numbers, hyphens. Used for Wrangler env and Terraform module key.</small>
      </label>
      <label class="field">
        <span>Hostname</span>
        <input type="text" name="hostname" value="${escapeAttr(form.hostname)}" placeholder="demo.${escapeAttr(ctx.zoneName)}" />
      </label>
    `;
  }

  if (step === 2 && mode !== 'delete') {
    body += `
      <p class="muted">Wrangler environment key: <code>${escapeHtml(form.siteId)}</code> — isolates Worker, D1, and R2 for this site (<code>wrangler deploy --env ${escapeHtml(form.siteId)}</code>). Same as site id unless you have a legacy stack like production.</p>
      ${mode === 'update' || ctx.hubEnvironmentCustom ? `
      <label class="field">
        <span>Hub environment (advanced)</span>
        <input type="text" name="hubEnvironment" value="${escapeAttr(form.hubEnvironment || form.siteId)}" />
      </label>` : `
      <label class="field checkbox">
        <input type="checkbox" name="customHubEnvironment" />
        <span>Use a different Wrangler environment key (legacy imports only)</span>
      </label>`}
      <label class="field checkbox">
        <input type="checkbox" name="vanilla" ${form.vanilla ? 'checked' : ''} />
        <span>Vanilla template (starter guide, dummy secrets)</span>
      </label>
      <label class="field checkbox">
        <input type="checkbox" name="attachHubApiBinding" ${form.attachHubApiBinding ? 'checked' : ''} />
        <span>Attach HUB_API binding on first Terraform apply</span>
        <small class="muted">Leave off until the Worker exists; enable on a second apply.</small>
      </label>
    `;
  }

  if (mode === 'delete' && step === 1) {
    body += `
      <p class="muted">This opens a pull request that removes <code>${escapeHtml(form.siteId)}</code> from the registry. After merge, CI tears down Cloudflare resources automatically.</p>
      <label class="field">
        <span>Type hostname to confirm</span>
        <input type="text" name="confirmHostname" value="${escapeAttr(form.confirmHostname)}" placeholder="${escapeAttr(String(ctx.site?.hostname ?? form.hostname))}" autocomplete="off" />
      </label>
    `;
  }

  if (mode === 'delete' && step === 2) {
    body += `<dl class="review">${renderReview(mode, form)}</dl>`;
    body += `<p class="muted">Step 1 (automated): GitHub opens a PR removing the site from the registry and Wrangler stubs.</p>`;
    body += `<p class="muted">Step 2 (automated): after merge to <code>main</code>, <strong>Platform site deprovision</strong> deletes the Worker, destroys Terraform resources (D1, R2, Pages, Access, DNS), and refreshes the platform manifest.</p>`;
  } else if (mode !== 'delete' && step === 3) {
    body += `<dl class="review">${renderReview(mode, form)}</dl>`;
    body += `<p class="muted">Step 1 (automated): GitHub opens a PR updating the site registry and Wrangler stubs.</p>`;
    body += `<p class="muted">Step 2 (automated): after merge to <code>main</code>, <strong>Platform site provision</strong> runs Terraform apply, Worker deploy, Pages deploy, and refreshes the platform manifest.</p>`;
  }

  const isFinal = step === totalSteps(mode);
  const canSubmit = ctx.githubConfigured && !(mode === 'delete' && ctx.protectedIds.has(form.siteId));

  return `
    <header class="wizard-head">
      <p class="eyebrow">${escapeHtml(mode)} site</p>
      <h2>${escapeHtml(title)}</h2>
      <button type="button" class="wizard-close" aria-label="Close">&times;</button>
    </header>
    <div class="wizard-body">${body}<p class="wizard-error" hidden></p></div>
    <footer class="wizard-foot">
      ${step > 1 ? '<button type="button" class="btn btn-ghost" data-wizard-back>Back</button>' : '<button type="button" class="btn btn-ghost" data-wizard-close>Cancel</button>'}
      ${isFinal ? `<button type="button" class="btn" data-wizard-submit ${canSubmit ? '' : 'disabled'}>${mode === 'delete' ? 'Delete via PR' : 'Create PR'}</button>` : '<button type="button" class="btn" data-wizard-next>Next</button>'}
    </footer>
  `;
}

/**
 * @param {WizardMode} mode
 * @param {WizardForm} form
 */
function renderReview(mode, form) {
  if (mode === 'delete') {
    return `
      <div><dt>Site</dt><dd><code>${escapeHtml(form.siteId)}</code></dd></div>
      <div><dt>Confirm</dt><dd><code>${escapeHtml(form.confirmHostname)}</code></dd></div>
    `;
  }
  return `
    <div><dt>Site id</dt><dd><code>${escapeHtml(form.siteId)}</code></dd></div>
    <div><dt>Hostname</dt><dd><code>${escapeHtml(form.hostname)}</code></dd></div>
    <div><dt>Wrangler env</dt><dd><code>${escapeHtml(form.hubEnvironment || form.siteId)}</code></dd></div>
    <div><dt>Vanilla</dt><dd>${form.vanilla ? 'yes' : 'no'}</dd></div>
    <div><dt>HUB_API on first apply</dt><dd>${form.attachHubApiBinding ? 'yes' : 'no'}</dd></div>
  `;
}

/**
 * @param {HTMLElement} panel
 * @param {WizardForm} form
 * @param {WizardMode} mode
 * @param {number} step
 * @param {object} handlers
 */
function wireWizardStep(panel, form, mode, step, handlers) {
  panel.querySelector('[name="siteId"]')?.addEventListener('input', (event) => {
    form.siteId = /** @type {HTMLInputElement} */ (event.target).value.trim().toLowerCase();
    if (!form.hostname || form.hostname.endsWith(`.${handlers.zoneName}`)) {
      form.hostname = form.siteId ? `${form.siteId}.${handlers.zoneName}` : '';
    }
  });
  panel.querySelector('[name="hostname"]')?.addEventListener('input', (event) => {
    form.hostname = /** @type {HTMLInputElement} */ (event.target).value.trim().toLowerCase();
  });
  panel.querySelector('[name="hubEnvironment"]')?.addEventListener('input', (event) => {
    form.hubEnvironment = /** @type {HTMLInputElement} */ (event.target).value.trim();
    handlers.setHubEnvironmentCustom?.(true);
  });
  panel.querySelector('[name="customHubEnvironment"]')?.addEventListener('change', (event) => {
    const checked = /** @type {HTMLInputElement} */ (event.target).checked;
    handlers.setHubEnvironmentCustom?.(checked);
    if (!checked) form.hubEnvironment = form.siteId;
    handlers.onRerender?.();
  });
  panel.querySelector('[name="vanilla"]')?.addEventListener('change', (event) => {
    form.vanilla = /** @type {HTMLInputElement} */ (event.target).checked;
  });
  panel.querySelector('[name="attachHubApiBinding"]')?.addEventListener('change', (event) => {
    form.attachHubApiBinding = /** @type {HTMLInputElement} */ (event.target).checked;
  });
  panel.querySelector('[name="confirmHostname"]')?.addEventListener('input', (event) => {
    form.confirmHostname = /** @type {HTMLInputElement} */ (event.target).value.trim();
  });

  panel.querySelector('[data-wizard-close]')?.addEventListener('click', handlers.onClose);
  panel.querySelector('.wizard-close')?.addEventListener('click', handlers.onClose);
  panel.querySelector('[data-wizard-back]')?.addEventListener('click', handlers.onBack);
  panel.querySelector('[data-wizard-next]')?.addEventListener('click', handlers.onNext);
  panel.querySelector('[data-wizard-submit]')?.addEventListener('click', () => {
    handlers.onSubmit?.();
  });
}

/**
 * @param {WizardMode} mode
 * @param {number} step
 * @param {WizardForm} form
 * @param {object} ctx
 */
function validateStep(mode, step, form, ctx) {
  if (mode === 'delete') {
    if (step === 1 && form.confirmHostname !== String(ctx.site?.hostname ?? form.hostname)) {
      return `Type the exact hostname "${ctx.site?.hostname ?? form.hostname}" to confirm.`;
    }
    return null;
  }

  if (step === 1) {
    if (!form.siteId) return 'Site id is required.';
    if (!/^[a-z][a-z0-9_-]{0,31}$/.test(form.siteId)) return 'Invalid site id format.';
    if (!form.hostname) return 'Hostname is required.';
    if (!form.hostname.endsWith(`.${ctx.zoneName}`)) return `Hostname must be under ${ctx.zoneName}.`;
  }

  return null;
}

/**
 * @param {HTMLElement} panel
 * @param {string} message
 */
function showWizardError(panel, message) {
  const el = panel.querySelector('.wizard-error');
  if (!el) return;
  el.textContent = message;
  el.hidden = false;
}

/**
 * @param {WizardMode} mode
 * @param {WizardForm} form
 * @param {HTMLElement} panel
 * @param {boolean} githubConfigured
 * @param {(() => void | Promise<void>) | undefined} onComplete
 * @param {() => void} close
 */
async function submitWizard(mode, form, panel, githubConfigured, onComplete, close) {
  if (!githubConfigured) return;
  const submitBtn = panel.querySelector('[data-wizard-submit]');
  if (submitBtn) {
    submitBtn.setAttribute('disabled', 'true');
    submitBtn.textContent = 'Submitting…';
  }

  try {
    const payload = {
      siteId: form.siteId,
      hostname: form.hostname,
      hubEnvironment: form.hubEnvironment || form.siteId,
      vanilla: form.vanilla,
      attachHubApiBinding: form.attachHubApiBinding
    };

    let result;
    if (mode === 'create') result = await createSite(payload);
    else if (mode === 'update') result = await updateSite(form.siteId, payload);
    else result = await deleteSite(form.siteId, { confirmHostname: form.confirmHostname });

    panel.querySelector('.wizard-body').innerHTML = `
      <div class="banner banner-ok">${escapeHtml(result.message ?? 'Automation started.')}</div>
      <p class="wizard-links">
        ${result.workflowRunUrl ? `<a class="btn btn-small" href="${escapeAttr(String(result.workflowRunUrl))}" target="_blank" rel="noopener">Open workflow run</a>` : ''}
        ${result.actionsWorkflowUrl ? `<a class="btn btn-small btn-ghost" href="${escapeAttr(String(result.actionsWorkflowUrl))}" target="_blank" rel="noopener">All site-manage runs</a>` : ''}
      </p>
      <p class="muted">The pull request is created at the <strong>end</strong> of the workflow (after Terraform validate + tests). If the run fails, there is no PR — check the run log.</p>
      <p class="muted">When the PR is created, auto-merge is enabled — it merges to <code>main</code> once CI passes; if checks fail, the PR stays open.</p>
      <p class="muted">After merge, <strong>Platform site provision</strong> provisions the hub automatically.</p>
    `;
    panel.querySelector('.wizard-foot').innerHTML =
      '<button type="button" class="btn" data-wizard-done>Done</button>';
    panel.querySelector('[data-wizard-done]')?.addEventListener('click', () => {
      close();
      onComplete?.();
    });
  } catch (error) {
    showWizardError(panel, error instanceof Error ? error.message : String(error));
    submitBtn?.removeAttribute('disabled');
    if (submitBtn) submitBtn.textContent = mode === 'delete' ? 'Delete via PR' : 'Create PR';
  }
}

/**
 * @param {string} siteId
 * @param {() => void | Promise<void>} [onComplete]
 */
export async function confirmDeployWorker(siteId, onComplete) {
  if (!window.confirm(`Deploy Worker for "${siteId}" via GitHub Actions?`)) return;
  try {
    const result = await deploySiteWorker(siteId);
    window.alert(result.message ?? 'Deploy started.');
    await onComplete?.();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : String(error));
  }
}

/**
 * @param {string} siteId
 * @param {() => void | Promise<void>} [onComplete]
 */
export async function confirmProvisionSite(siteId, onComplete) {
  if (
    !window.confirm(
      `Provision hub "${siteId}" via GitHub Actions?\n\nThis runs terraform apply, Worker secrets, D1 migrate, Worker deploy, Pages deploy, and platform manifest refresh.`
    )
  ) {
    return;
  }
  try {
    const result = await provisionSite(siteId);
    window.alert(result.message ?? 'Provision started.');
    await onComplete?.();
  } catch (error) {
    window.alert(error instanceof Error ? error.message : String(error));
  }
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

export { deploySiteWorker };
