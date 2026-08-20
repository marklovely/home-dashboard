import {
  cloudflareUsageApiConfigured,
  resolveCloudflareAccountId
} from './platformCloudflareUsage.js';

/** @typedef {Record<string, string | undefined>} PlatformEnv */

/**
 * Same token as storage usage; needs Account → Cloudflare Pages → Edit for toggling.
 *
 * @param {PlatformEnv} env
 */
export function cloudflarePagesApiConfigured(env) {
  return cloudflareUsageApiConfigured(env);
}

/**
 * @param {Record<string, unknown>} site
 * @param {Record<string, unknown>} platform
 * @param {PlatformEnv} env
 */
export async function fetchSitePagesPreviewStatus(site, platform, env) {
  if (!cloudflarePagesApiConfigured(env)) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      message:
        'Set PLATFORM_CF_API_TOKEN (Account → Cloudflare Pages → Edit) and CLOUDFLARE_ACCOUNT_ID on the platform Pages project.'
    };
  }

  const pagesProject = String(site.pagesProject ?? '').trim();
  if (!pagesProject) {
    return { ok: false, code: 'MISSING_PROJECT', message: 'Site has no Pages project name in manifest.' };
  }

  const accountId = resolveCloudflareAccountId(env, platform);
  const token = env.PLATFORM_CF_API_TOKEN?.trim();
  if (!accountId || !token) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      message: 'Cloudflare account id or API token is missing.'
    };
  }

  try {
    const project = await fetchPagesProject(accountId, token, pagesProject);
    return {
      ok: true,
      enabled: isPagesPreviewEnabled(project),
      pagesProject,
      previewDeploymentSetting: project?.source?.config?.preview_deployment_setting ?? 'unknown'
    };
  } catch (error) {
    return {
      ok: false,
      code: 'CLOUDFLARE_ERROR',
      message: error instanceof Error ? error.message : 'Could not read Pages preview setting.'
    };
  }
}

/**
 * @param {Record<string, unknown>} site
 * @param {Record<string, unknown>} platform
 * @param {PlatformEnv} env
 * @param {boolean} enabled
 */
export async function setSitePagesPreviewEnabled(site, platform, env, enabled) {
  const status = await fetchSitePagesPreviewStatus(site, platform, env);
  if (!status.ok && status.code === 'NOT_CONFIGURED') {
    return status;
  }
  if (!status.ok) {
    return status;
  }

  const accountId = resolveCloudflareAccountId(env, platform);
  const token = env.PLATFORM_CF_API_TOKEN?.trim();
  const pagesProject = String(site.pagesProject ?? '').trim();

  try {
    const result = await setPagesPreviewEnabled(accountId, token, pagesProject, enabled);
    return {
      ok: true,
      enabled: result.enabled,
      pagesProject: result.pagesProject,
      message: enabled
        ? 'PR preview builds enabled. Redeploy an open PR branch to pick up preview env vars.'
        : 'PR preview builds disabled for this site.'
    };
  } catch (error) {
    return {
      ok: false,
      code: 'CLOUDFLARE_ERROR',
      message: error instanceof Error ? error.message : 'Could not update Pages preview setting.'
    };
  }
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} pagesProject
 */
async function fetchPagesProject(accountId, token, pagesProject) {
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
    throw new Error(msg);
  }
  return body.result;
}

/**
 * @param {Record<string, unknown>} project
 */
function isPagesPreviewEnabled(project) {
  return project?.source?.config?.preview_deployment_setting === 'all';
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} pagesProject
 * @param {boolean} enabled
 */
async function setPagesPreviewEnabled(accountId, token, pagesProject, enabled) {
  const project = await fetchPagesProject(accountId, token, pagesProject);
  const deploymentConfigs = structuredClone(project.deployment_configs ?? {});
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

  const source = structuredClone(project.source ?? { type: 'github', config: {} });
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
    throw new Error(msg);
  }

  return {
    enabled: isPagesPreviewEnabled(body.result),
    pagesProject
  };
}
