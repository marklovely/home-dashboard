/**
 * Hub job consumer: dispatch GitHub Actions from Cloudflare Queues.
 *
 * Two queues share this Worker:
 * - lovely-home-hub-provision (max concurrency 4): provision | teardown
 * - lovely-home-hub-registry (max concurrency 1): record | drop
 *
 * Registry jobs wait until the GitHub run finishes so the queue lock
 * covers the git write, not only the dispatch HTTP call.
 */

export const HUB_PROVISION_QUEUE_NAME = 'lovely-home-hub-provision';
export const HUB_REGISTRY_QUEUE_NAME = 'lovely-home-hub-registry';

const PROVISION_ACTIONS = new Set(['provision', 'teardown']);
const REGISTRY_ACTIONS = new Set(['record', 'drop']);
const SITE_ID_RE = /^[a-z][a-z0-9-]{0,31}$/;

/**
 * @param {unknown} body
 * @returns {{ siteId: string, action: string, ref: string }}
 */
export function parseHubJobMessage(body) {
  /** @type {Record<string, unknown>} */
  let payload = {};
  if (typeof body === 'string') {
    try {
      payload = JSON.parse(body);
    } catch {
      throw new Error('Hub job message is not valid JSON.');
    }
  } else if (body && typeof body === 'object') {
    payload = /** @type {Record<string, unknown>} */ (body);
  } else {
    throw new Error('Hub job message is empty.');
  }

  const siteId = String(payload.siteId ?? '').trim();
  const action = String(payload.action ?? '').trim();
  const ref = String(payload.ref ?? '').trim();
  if (!SITE_ID_RE.test(siteId)) {
    throw new Error(`Invalid site id in hub job: ${JSON.stringify(siteId)}`);
  }
  if (!PROVISION_ACTIONS.has(action) && !REGISTRY_ACTIONS.has(action)) {
    throw new Error(`Unknown hub job action: ${JSON.stringify(action)}`);
  }
  return { siteId, action, ref };
}

/**
 * @param {string} queueName
 */
export function isRegistryQueue(queueName) {
  return queueName === HUB_REGISTRY_QUEUE_NAME || queueName.endsWith('-hub-registry');
}

/**
 * @param {Record<string, string | undefined>} env
 */
function githubRepo(env) {
  return (env.PLATFORM_GITHUB_REPO ?? 'marklovely/home-dashboard').trim();
}

/**
 * @param {Record<string, string | undefined>} env
 */
function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.PLATFORM_GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'lovely-home-hub-jobs',
    'X-GitHub-Api-Version': '2022-11-28'
  };
}

/**
 * @param {string} action
 */
export function workflowForAction(action) {
  if (action === 'provision') {
    return {
      file: 'platform-site-provision.yml',
      inputs: (siteId, _ref) => ({ site_id: siteId, skip_pages: 'false', skip_platform_admin: 'true' })
    };
  }
  if (action === 'teardown') {
    return {
      file: 'platform-site-billing-deprovision.yml',
      inputs: (siteId, _ref) => ({ site_id: siteId })
    };
  }
  return {
    file: 'platform-site-registry.yml',
    inputs: (siteId, ref) => ({
      site_id: siteId,
      action,
      source_ref: ref
    })
  };
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} workflowFile
 * @param {number} dispatchedAtMs
 * @returns {Promise<{ id: number, htmlUrl: string, status: string, conclusion: string | null } | null>}
 */
async function findDispatchedRun(env, workflowFile, dispatchedAtMs) {
  const repo = githubRepo(env);
  const [owner, repoName] = repo.split('/');
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
    const run = (body.workflow_runs ?? []).find((entry) => {
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
 * @param {number} runId
 */
async function waitForRunConclusion(env, runId) {
  const repo = githubRepo(env);
  const [owner, repoName] = repo.split('/');
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/actions/runs/${runId}`, {
      headers: githubHeaders(env)
    });
    if (!response.ok) continue;
    const run = await response.json();
    if (run.status === 'completed') {
      if (run.conclusion !== 'success') {
        throw new Error(
          `GitHub run ${runId} finished ${run.conclusion ?? 'unknown'} (${run.html_url ?? runId}).`
        );
      }
      return run;
    }
  }
  throw new Error(`GitHub run ${runId} did not finish before the hub-jobs wait limit.`);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {{ siteId: string, action: string, ref: string }} job
 * @param {{ wait: boolean }} options
 */
export async function dispatchHubJob(env, job, options) {
  const token = String(env.PLATFORM_GITHUB_TOKEN ?? '').trim();
  if (!token) {
    throw new Error('PLATFORM_GITHUB_TOKEN is not set on the hub-jobs Worker.');
  }
  const repo = githubRepo(env);
  const [owner, repoName] = repo.split('/');
  if (!owner || !repoName) {
    throw new Error('PLATFORM_GITHUB_REPO must be owner/name.');
  }
  if (REGISTRY_ACTIONS.has(job.action) && !job.ref) {
    throw new Error(`Registry job ${job.action} for ${job.siteId} is missing source_ref.`);
  }

  const workflow = workflowForAction(job.action);
  const ref = env.PLATFORM_GITHUB_REF?.trim() || 'main';
  const dispatchedAtMs = Date.now();
  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repoName}/actions/workflows/${workflow.file}/dispatches`,
    {
      method: 'POST',
      headers: {
        ...githubHeaders(env),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ref,
        inputs: workflow.inputs(job.siteId, job.ref)
      })
    }
  );
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`GitHub dispatch failed (${response.status}). ${detail.slice(0, 200)}`);
  }

  if (!options.wait) return { workflow: workflow.file, waited: false };

  const run = await findDispatchedRun(env, workflow.file, dispatchedAtMs);
  if (!run) {
    throw new Error(`GitHub did not show a ${workflow.file} run after dispatch.`);
  }
  await waitForRunConclusion(env, run.id);
  return { workflow: workflow.file, waited: true, runId: run.id };
}

/**
 * @param {string} queueName
 * @param {unknown} body
 * @param {Record<string, string | undefined>} env
 */
export async function handleHubJob(queueName, body, env) {
  const job = parseHubJobMessage(body);
  const registry = isRegistryQueue(queueName);
  if (registry && !REGISTRY_ACTIONS.has(job.action)) {
    throw new Error(`Action ${job.action} cannot run on the registry queue.`);
  }
  if (!registry && !PROVISION_ACTIONS.has(job.action)) {
    throw new Error(`Action ${job.action} cannot run on the provision queue.`);
  }
  return dispatchHubJob(env, job, { wait: registry });
}

export default {
  /**
   * @param {{ queue: string, messages: { body: unknown, ack: () => void, retry: () => void }[] }} batch
   * @param {Record<string, string | undefined>} env
   */
  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        await handleHubJob(batch.queue, message.body, env);
        message.ack();
      } catch (error) {
        const text = error instanceof Error ? error.message : String(error);
        console.error(JSON.stringify({ queue: batch.queue, error: text }));
        message.retry();
      }
    }
  }
};
