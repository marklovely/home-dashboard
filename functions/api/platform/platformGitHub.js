/**
 * GitHub Actions integration for platform site automation.
 */

/**
 * @param {Record<string, string | undefined>} env
 */
export function githubAutomationConfigured(env) {
  return Boolean(env.PLATFORM_GITHUB_TOKEN?.trim() && githubRepo(env));
}

/**
 * @param {Record<string, string | undefined>} env
 */
export function githubRepo(env) {
  return (env.PLATFORM_GITHUB_REPO ?? 'marklovely/home-dashboard').trim();
}

/**
 * @param {Record<string, string | undefined>} env
 */
function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.PLATFORM_GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'lovely-home-platform-admin',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} workflowFile
 * @param {number} [dispatchedAtMs]
 */
async function waitForWorkflowRun(env, workflowFile, dispatchedAtMs = Date.now()) {
  const repo = githubRepo(env);
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) return null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflowFile}/runs?event=workflow_dispatch&per_page=5`,
      { headers: githubHeaders(env) }
    );
    if (!response.ok) continue;

    const body = await response.json();
    const runs = body.workflow_runs ?? [];
    const run = runs.find((entry) => {
      const createdAt = Date.parse(String(entry.created_at ?? ''));
      return Number.isFinite(createdAt) && createdAt >= dispatchedAtMs - 5000;
    });

    if (run) {
      return {
        id: run.id,
        htmlUrl: run.html_url,
        status: run.status,
        conclusion: run.conclusion
      };
    }
  }

  return null;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} action
 * @param {Record<string, unknown>} payload
 */
export async function dispatchSiteManageWorkflow(env, action, payload) {
  if (!githubAutomationConfigured(env)) {
    return {
      ok: false,
      error: 'GITHUB_NOT_CONFIGURED',
      message:
        'Set PLATFORM_GITHUB_TOKEN and PLATFORM_GITHUB_REPO on the platform Pages project (repo scope: actions:write, contents:write).'
    };
  }

  const repo = githubRepo(env);
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    return { ok: false, error: 'INVALID_REPO', message: 'PLATFORM_GITHUB_REPO must be owner/name.' };
  }

  const ref = env.PLATFORM_GITHUB_REF?.trim() || 'main';
  const dispatchedAtMs = Date.now();
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/platform-site-manage.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        ...githubHeaders(env),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref,
        inputs: {
          action,
          payload: JSON.stringify(payload)
        }
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return {
      ok: false,
      error: 'GITHUB_DISPATCH_FAILED',
      message: `GitHub workflow dispatch failed (${response.status}). ${detail.slice(0, 200)}`
    };
  }

  const run = await waitForWorkflowRun(env, 'platform-site-manage.yml', dispatchedAtMs);
  const actionsWorkflowUrl = `https://github.com/${owner}/${repoName}/actions/workflows/platform-site-manage.yml`;

  return {
    ok: true,
    action,
    siteId: payload.siteId,
    repo,
    ref,
    workflow: 'platform-site-manage.yml',
    actionsWorkflowUrl,
    workflowRunUrl: run?.htmlUrl ?? actionsWorkflowUrl,
    workflowRunStatus: run?.status ?? 'queued',
    message: run?.htmlUrl
      ? 'Automation started — the pull request opens when this workflow run succeeds.'
      : 'Automation started — open GitHub Actions to track the pull request.'
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ limit?: number }} [options]
 */
export async function listRecentWorkflowRuns(env, options = {}) {
  if (!githubAutomationConfigured(env)) {
    return { ok: false, runs: [], error: 'GITHUB_NOT_CONFIGURED' };
  }

  const repo = githubRepo(env);
  const [owner, repoName] = repo.split('/');
  const limit = Math.min(Math.max(options.limit ?? 8, 1), 20);
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/platform-site-manage.yml/runs?per_page=${limit}`,
    { headers: githubHeaders(env) }
  );

  if (!response.ok) {
    return { ok: false, runs: [], error: `GitHub API ${response.status}` };
  }

  const body = await response.json();
  const runs = (body.workflow_runs ?? []).map((run) => ({
    id: run.id,
    status: run.status,
    conclusion: run.conclusion,
    htmlUrl: run.html_url,
    createdAt: run.created_at,
    displayTitle: run.display_title,
    event: run.event
  }));

  return { ok: true, runs };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} siteId
 * @param {{ skipPages?: boolean, skipPlatformAdmin?: boolean }} [options]
 */
export async function dispatchSiteProvisionWorkflow(env, siteId, options = {}) {
  if (!githubAutomationConfigured(env)) {
    return {
      ok: false,
      error: 'GITHUB_NOT_CONFIGURED',
      message: 'GitHub automation is not configured on this platform project.'
    };
  }

  const repo = githubRepo(env);
  const [owner, repoName] = repo.split('/');
  const ref = env.PLATFORM_GITHUB_REF?.trim() || 'main';
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/platform-site-provision.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        ...githubHeaders(env),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref,
        inputs: {
          site_id: siteId,
          skip_pages: String(options.skipPages === true),
          skip_platform_admin: String(options.skipPlatformAdmin === true)
        }
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return {
      ok: false,
      error: 'GITHUB_DISPATCH_FAILED',
      message: `Provision dispatch failed (${response.status}). ${detail.slice(0, 200)}`
    };
  }

  return {
    ok: true,
    siteId,
    workflow: 'platform-site-provision.yml',
    message: `Full hub provisioning started for ${siteId}. Track progress in GitHub Actions.`
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} siteId
 */
export async function dispatchSiteDeployWorkflow(env, siteId) {
  if (!githubAutomationConfigured(env)) {
    return {
      ok: false,
      error: 'GITHUB_NOT_CONFIGURED',
      message: 'GitHub automation is not configured on this platform project.'
    };
  }

  const repo = githubRepo(env);
  const [owner, repoName] = repo.split('/');
  const ref = env.PLATFORM_GITHUB_REF?.trim() || 'main';
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/platform-site-deploy.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        ...githubHeaders(env),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref,
        inputs: {
          site_id: siteId,
          skip_migrate: 'false'
        }
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return {
      ok: false,
      error: 'GITHUB_DISPATCH_FAILED',
      message: `Worker deploy dispatch failed (${response.status}). ${detail.slice(0, 200)}`
    };
  }

  return {
    ok: true,
    siteId,
    workflow: 'platform-site-deploy.yml',
    message: `Worker deploy started for ${siteId}.`
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} siteId
 */
export async function dispatchSiteBillingDeprovisionWorkflow(env, siteId) {
  if (!githubAutomationConfigured(env)) {
    return {
      ok: false,
      error: 'GITHUB_NOT_CONFIGURED',
      message: 'GitHub automation is not configured on this platform project.'
    };
  }

  const repo = githubRepo(env);
  const [owner, repoName] = repo.split('/');
  const ref = env.PLATFORM_GITHUB_REF?.trim() || 'main';
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/platform-site-billing-deprovision.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        ...githubHeaders(env),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref,
        inputs: {
          site_id: siteId
        }
      })
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    return {
      ok: false,
      error: 'GITHUB_DISPATCH_FAILED',
      message: `Billing deprovision dispatch failed (${response.status}). ${detail.slice(0, 200)}`
    };
  }

  return {
    ok: true,
    siteId,
    workflow: 'platform-site-billing-deprovision.yml',
    message: `Billing deprovision started for ${siteId} (archive → registry removal PR → deprovision on merge). Track progress in GitHub Actions.`
  };
}
