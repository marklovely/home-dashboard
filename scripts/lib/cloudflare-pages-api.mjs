/**
 * Cloudflare Pages deployment list/delete via REST API (for deprovision).
 */
import { parseCloudflareApiJson } from './cloudflare-api-json.mjs';

const DEFAULT_PER_PAGE = 25;
const DEFAULT_DELETE_CONCURRENCY = 20;
const MAX_DELETE_ATTEMPTS = 5;

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} path
 * @param {{ method?: string, body?: unknown, query?: Record<string, string> }} [options]
 */
async function cloudflarePagesRequest(accountId, token, path, options = {}) {
  const method = options.method ?? 'GET';
  const params = new URLSearchParams(options.query ?? {});
  const query = params.toString();
  const url = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}${path}${query ? `?${query}` : ''}`;

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const text = await response.text();
  const body = parseCloudflareApiJson(text, {
    ok: response.ok,
    status: response.status,
    path,
    method
  });

  if (!body.success) {
    const message =
      body.errors?.map((entry) => entry.message).filter(Boolean).join('; ') ||
      `HTTP ${response.status}`;
    const error = new Error(`${method} ${path} failed: ${message}`);
    error.status = response.status;
    error.cloudflareErrors = body.errors;
    throw error;
  }

  return body;
}

/**
 * @param {() => Promise<unknown>} operation
 * @param {{ attempts?: number, onRetry?: (attempt: number, error: Error) => void }} [options]
 */
async function withCloudflareRetry(operation, options = {}) {
  const attempts = options.attempts ?? MAX_DELETE_ATTEMPTS;
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const status = /** @type {{ status?: number }} */ (lastError).status;
      const retryable = status === 429 || status === 502 || status === 503 || status === 504;
      if (!retryable || attempt >= attempts) {
        throw lastError;
      }
      const delayMs = Math.min(30_000, 1000 * 2 ** (attempt - 1));
      options.onRetry?.(attempt, lastError);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError ?? new Error('Cloudflare request failed.');
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} projectName
 * @param {{ perPage?: number, onProgress?: (message: string) => void }} [options]
 */
export async function listAllPagesDeployments(accountId, token, projectName, options = {}) {
  const perPage = options.perPage ?? DEFAULT_PER_PAGE;
  const project = encodeURIComponent(projectName.trim());
  const deployments = [];

  for (let page = 1; ; page += 1) {
    const body = await withCloudflareRetry(() =>
      cloudflarePagesRequest(accountId, token, `/pages/projects/${project}/deployments`, {
        query: {
          page: String(page),
          per_page: String(perPage)
        }
      })
    );

    const batch = Array.isArray(body.result) ? body.result : [];
    for (const entry of batch) {
      const id = String(entry?.id ?? '').trim();
      if (id) deployments.push(id);
    }

    const totalPages = Number(body.result_info?.total_pages ?? 0);
    options.onProgress?.(
      `Listed ${deployments.length} deployment(s) for ${projectName} (page ${page}${totalPages ? `/${totalPages}` : ''})`
    );

    if (batch.length === 0) break;
    if (totalPages > 0) {
      if (page >= totalPages) break;
    } else if (batch.length < perPage) {
      break;
    }
  }

  return deployments;
}

/**
 * @param {Error} error
 */
export function isActiveProductionDeploymentDeleteError(error) {
  return /active production deployment/i.test(error instanceof Error ? error.message : String(error));
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} projectName
 * @param {string} deploymentId
 */
export async function deletePagesDeployment(accountId, token, projectName, deploymentId) {
  const project = encodeURIComponent(projectName.trim());
  const deployment = encodeURIComponent(deploymentId.trim());

  await withCloudflareRetry(() =>
    cloudflarePagesRequest(
      accountId,
      token,
      `/pages/projects/${project}/deployments/${deployment}`,
      {
        method: 'DELETE',
        query: { force: 'true' }
      }
    )
  );
}

/**
 * Delete every Pages deployment so Terraform can destroy the project (Cloudflare 8000076).
 *
 * @param {string} projectName
 * @param {{ accountId: string, token: string, onProgress?: (message: string) => void }} options
 */
export async function prunePagesProjectDeployments(projectName, options) {
  const accountId = options.accountId.trim();
  const token = options.token.trim();
  const name = projectName.trim();
  if (!accountId || !token || !name) {
    throw new Error('prunePagesProjectDeployments requires accountId, token, and projectName.');
  }

  options.onProgress?.(`Listing Pages deployments for "${name}"`);
  const deploymentIds = await listAllPagesDeployments(accountId, token, name, {
    onProgress: options.onProgress
  });

  if (deploymentIds.length === 0) {
    return { projectName: name, deleted: 0, skippedActiveProduction: 0, remaining: 0 };
  }

  options.onProgress?.(`Deleting ${deploymentIds.length} deployment(s) from ${name}`);
  let deleted = 0;
  let skippedActiveProduction = 0;

  for (let index = 0; index < deploymentIds.length; index += DEFAULT_DELETE_CONCURRENCY) {
    const batch = deploymentIds.slice(index, index + DEFAULT_DELETE_CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((deploymentId) => deletePagesDeployment(accountId, token, name, deploymentId))
    );
    for (const result of results) {
      if (result.status === 'fulfilled') {
        deleted += 1;
        continue;
      }
      if (isActiveProductionDeploymentDeleteError(result.reason)) {
        skippedActiveProduction += 1;
        continue;
      }
      throw result.reason;
    }
    options.onProgress?.(
      `Deleted ${deleted}/${deploymentIds.length} deployment(s) from ${name}${skippedActiveProduction ? ` (${skippedActiveProduction} active production skipped)` : ''}`
    );
  }

  const remaining = await listAllPagesDeployments(accountId, token, name);
  return {
    projectName: name,
    deleted,
    skippedActiveProduction,
    remaining: remaining.length
  };
}
