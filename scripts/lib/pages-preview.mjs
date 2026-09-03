/**
 * Cloudflare Pages PR preview enable/disable (hub sites).
 * Terraform cannot safely PATCH preview + HUB_API bindings (8000022).
 */

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} pagesProject
 */
export async function fetchPagesProject(accountId, token, pagesProject) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${encodeURIComponent(pagesProject)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    }
  );
  const body = await response.json();
  if (!body.success) {
    const msg = body.errors?.map((error) => error.message).join('; ') ?? JSON.stringify(body.errors);
    throw new Error(`GET Pages project ${pagesProject} failed: ${msg}`);
  }
  return body.result;
}

/**
 * @param {Record<string, unknown>} project
 */
export function isPagesPreviewEnabled(project) {
  const setting = /** @type {{ source?: { config?: { preview_deployment_setting?: string } } }} */ (
    project
  ).source?.config?.preview_deployment_setting;
  return setting === 'all';
}

/**
 * @param {Record<string, unknown>} project
 */
export function isPagesGitProductionEnabled(project) {
  const enabled = /** @type {{ source?: { config?: { production_deployments_enabled?: boolean } } }} */ (
    project
  ).source?.config?.production_deployments_enabled;
  return enabled !== false;
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} pagesProject
 * @param {boolean} enabled
 */
export async function setPagesGitProductionEnabled(accountId, token, pagesProject, enabled) {
  const project = await fetchPagesProject(accountId, token, pagesProject);
  const source = structuredClone(
    /** @type {{ type?: string, config?: Record<string, unknown> }} */ (project.source ?? {
      type: 'github',
      config: {}
    })
  );
  source.config ??= {};
  source.config.production_deployments_enabled = enabled;

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${encodeURIComponent(pagesProject)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ source })
    }
  );
  const body = await response.json();
  if (!body.success) {
    const msg = body.errors?.map((error) => error.message).join('; ') ?? JSON.stringify(body.errors);
    throw new Error(`PATCH Pages project ${pagesProject} failed: ${msg}`);
  }

  return {
    enabled: isPagesGitProductionEnabled(body.result),
    pagesProject
  };
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} pagesProject
 * @param {boolean} enabled
 */
export async function setPagesPreviewEnabled(accountId, token, pagesProject, enabled) {
  const project = await fetchPagesProject(accountId, token, pagesProject);
  const deploymentConfigs = structuredClone(
    /** @type {Record<string, Record<string, unknown>>} */ (project.deployment_configs ?? {})
  );
  deploymentConfigs.production ??= {};
  deploymentConfigs.preview ??= {
    fail_open: true,
    compatibility_date: '2024-12-01',
    compatibility_flags: ['nodejs_compat']
  };

  if (enabled) {
    if (deploymentConfigs.production.env_vars) {
      deploymentConfigs.preview.env_vars = structuredClone(deploymentConfigs.production.env_vars);
    }
    if (deploymentConfigs.production.services) {
      deploymentConfigs.preview.services = structuredClone(deploymentConfigs.production.services);
    }
  }

  const source = structuredClone(
    /** @type {{ type?: string, config?: Record<string, unknown> }} */ (project.source ?? {
      type: 'github',
      config: {}
    })
  );
  source.config ??= {};
  source.config.preview_deployment_setting = enabled ? 'all' : 'none';

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${encodeURIComponent(pagesProject)}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source,
        deployment_configs: deploymentConfigs
      })
    }
  );
  const body = await response.json();
  if (!body.success) {
    const msg = body.errors?.map((error) => error.message).join('; ') ?? JSON.stringify(body.errors);
    throw new Error(`PATCH Pages project ${pagesProject} failed: ${msg}`);
  }

  return {
    enabled: isPagesPreviewEnabled(body.result),
    pagesProject
  };
}
