/**
 * Cloudflare Pages deployment list/delete via REST API (for deprovision).
 */
import { parseCloudflareApiJson } from './cloudflare-api-json.mjs';
import { sleep } from './cloudflare-sequential-delete.mjs';

/** Pages deployments API accepts up to 25 per page (not higher). */
const PAGES_DEPLOYMENTS_LIST_PER_PAGE = 25;
/** Pages projects list API uses a lower per_page cap than deployments. */
const PAGES_PROJECTS_LIST_PER_PAGE = 20;
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
 * @typedef {{ id: string, created_on: string }} PagesDeploymentRecord
 */

/**
 * @param {PagesDeploymentRecord[]} records
 * @returns {PagesDeploymentRecord[]}
 */
export function sortPagesDeploymentsNewestFirst(records) {
  return [...records].sort((left, right) => {
    const leftTime = Date.parse(left.created_on) || 0;
    const rightTime = Date.parse(right.created_on) || 0;
    if (rightTime !== leftTime) return rightTime - leftTime;
    return right.id.localeCompare(left.id);
  });
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {{ perPage?: number, onProgress?: (message: string) => void }} [options]
 * @returns {Promise<string[]>}
 */
export async function listPagesProjectNames(accountId, token, options = {}) {
  const perPage = options.perPage ?? PAGES_PROJECTS_LIST_PER_PAGE;
  /** @type {string[]} */
  const projectNames = [];

  for (let page = 1; ; page += 1) {
    const body = await withCloudflareRetry(() =>
      cloudflarePagesRequest(accountId, token, '/pages/projects', {
        query: {
          page: String(page),
          per_page: String(perPage)
        }
      })
    );

    const batch = Array.isArray(body.result) ? body.result : [];
    for (const entry of batch) {
      const name = String(entry?.name ?? '').trim();
      if (name) projectNames.push(name);
    }

    const totalPages = Number(body.result_info?.total_pages ?? 0);
    options.onProgress?.(
      `Listed ${projectNames.length} Pages project(s) (page ${page}${totalPages ? `/${totalPages}` : ''})`
    );

    if (batch.length === 0) break;
    if (totalPages > 0) {
      if (page >= totalPages) break;
    } else if (batch.length < perPage) {
      break;
    }
  }

  return projectNames;
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} projectName
 * @param {{ perPage?: number, onProgress?: (message: string) => void }} [options]
 * @returns {Promise<PagesDeploymentRecord[]>}
 */
export async function listPagesDeploymentRecords(accountId, token, projectName, options = {}) {
  const perPage = options.perPage ?? PAGES_DEPLOYMENTS_LIST_PER_PAGE;
  const project = encodeURIComponent(projectName.trim());
  /** @type {PagesDeploymentRecord[]} */
  const records = [];

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
      if (!id) continue;
      records.push({
        id,
        created_on: String(entry?.created_on ?? entry?.modified_on ?? '')
      });
    }

    const totalPages = Number(body.result_info?.total_pages ?? 0);
    const shouldLog =
      !options.quiet ||
      page === 1 ||
      (totalPages > 0 && page >= totalPages) ||
      page % 10 === 0;
    if (shouldLog) {
      options.onProgress?.(
        `Listed ${records.length} deployment(s) for ${projectName} (page ${page}${totalPages ? `/${totalPages}` : ''})`
      );
    }

    if (batch.length === 0) break;
    if (totalPages > 0) {
      if (page >= totalPages) break;
    } else if (batch.length < perPage) {
      break;
    }
  }

  return sortPagesDeploymentsNewestFirst(records);
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} projectName
 * @param {number} page
 * @param {{ perPage?: number }} [options]
 */
async function fetchPagesDeploymentsPage(accountId, token, projectName, page, options = {}) {
  const perPage = options.perPage ?? PAGES_DEPLOYMENTS_LIST_PER_PAGE;
  const project = encodeURIComponent(projectName.trim());
  const body = await withCloudflareRetry(() =>
    cloudflarePagesRequest(accountId, token, `/pages/projects/${project}/deployments`, {
      query: {
        page: String(page),
        per_page: String(perPage)
      }
    })
  );

  const batch = Array.isArray(body.result) ? body.result : [];
  /** @type {PagesDeploymentRecord[]} */
  const records = [];
  for (const entry of batch) {
    const id = String(entry?.id ?? '').trim();
    if (!id) continue;
    records.push({
      id,
      created_on: String(entry?.created_on ?? entry?.modified_on ?? '')
    });
  }

  const totalCount = Number(body.result_info?.total_count ?? records.length);
  const totalPages = Number(body.result_info?.total_pages ?? (records.length ? 1 : 0));

  return { records, totalCount, totalPages, perPage };
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} projectName
 */
async function countPagesDeployments(accountId, token, projectName) {
  const page = await fetchPagesDeploymentsPage(accountId, token, projectName, 1);
  return page.totalCount;
}

/**
 * Delete one oldest deployment per loop (Cloudflare-recommended pattern for large histories).
 *
 * @param {string} accountId
 * @param {string} token
 * @param {string} projectName
 * @param {string} deploymentId
 * @param {{ delayMs?: number, onProgress?: (message: string) => void }} [options]
 */
async function deletePagesDeploymentWithBackoff(
  accountId,
  token,
  projectName,
  deploymentId,
  options = {}
) {
  const delayMs = options.delayMs ?? 500;
  const maxAttempts = 12;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      await deletePagesDeployment(accountId, token, projectName, deploymentId);
      return;
    } catch (error) {
      if (isActiveProductionDeploymentDeleteError(error)) {
        throw error;
      }
      const status = /** @type {{ status?: number }} */ (error)?.status;
      if (status === 429 || status === 502 || status === 503 || status === 504) {
        attempts += 1;
        const waitMs = Math.min(60_000, delayMs * 2 ** attempts);
        options.onProgress?.(`Rate limited — waiting ${Math.round(waitMs / 1000)}s`);
        await sleep(waitMs);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`Gave up deleting ${deploymentId} after ${maxAttempts} attempts.`);
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} projectName
 * @param {{ perPage?: number, onProgress?: (message: string) => void }} [options]
 */
export async function listAllPagesDeployments(accountId, token, projectName, options = {}) {
  const records = await listPagesDeploymentRecords(accountId, token, projectName, options);
  return records.map((entry) => entry.id);
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

/**
 * Delete older Pages deployments but keep the newest N (for routine cleanup).
 *
 * @param {string} projectName
 * @param {{
 *   accountId: string,
 *   token: string,
 *   keep?: number,
 *   dryRun?: boolean,
 *   delayMs?: number,
 *   quietList?: boolean,
 *   onProgress?: (message: string) => void
 * }} options
 */
export async function trimPagesProjectDeployments(projectName, options) {
  const accountId = options.accountId.trim();
  const token = options.token.trim();
  const name = projectName.trim();
  const keep = Math.max(1, Number(options.keep ?? 2));
  const delayMs = options.delayMs ?? 500;
  if (!accountId || !token || !name) {
    throw new Error('trimPagesProjectDeployments requires accountId, token, and projectName.');
  }

  const initial = await fetchPagesDeploymentsPage(accountId, token, name, 1);
  const initialTotal = initial.totalCount;
  if (initialTotal <= keep) {
    return {
      projectName: name,
      total: initialTotal,
      deleted: 0,
      skippedActiveProduction: 0,
      failed: 0,
      remaining: initialTotal
    };
  }

  options.onProgress?.(
    `${name}: ${initialTotal} deployment(s); keeping ${keep}, deleting oldest one-by-one`
  );

  if (options.dryRun) {
    return {
      projectName: name,
      total: initialTotal,
      deleted: 0,
      skippedActiveProduction: 0,
      failed: 0,
      remaining: initialTotal,
      dryRunDeleteIds: [`${initialTotal - keep} oldest (not listed in dry-run)`]
    };
  }

  let deleted = 0;
  let skippedActiveProduction = 0;
  let failed = 0;
  let stagnantPasses = 0;

  while (true) {
    const summary = await fetchPagesDeploymentsPage(accountId, token, name, 1);
    if (summary.totalCount <= keep) {
      break;
    }

    const lastPage = Math.max(1, summary.totalPages);
    const tail = await fetchPagesDeploymentsPage(accountId, token, name, lastPage);
    const oldest = tail.records[tail.records.length - 1];
    if (!oldest) {
      break;
    }

    const beforeCount = summary.totalCount;
    try {
      await deletePagesDeploymentWithBackoff(accountId, token, name, oldest.id, {
        delayMs,
        onProgress: options.onProgress
      });
      deleted += 1;
    } catch (error) {
      if (isActiveProductionDeploymentDeleteError(error)) {
        skippedActiveProduction += 1;
        options.onProgress?.(`${name}: reached protected production deployment; stopping trim`);
        break;
      }
      failed += 1;
      options.onProgress?.(
        `Delete failed for ${oldest.id}: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const afterCount = await countPagesDeployments(accountId, token, name);
    if (afterCount >= beforeCount) {
      stagnantPasses += 1;
      if (stagnantPasses >= 3) {
        options.onProgress?.(`${name}: no progress after ${stagnantPasses} attempts; stopping`);
        break;
      }
    } else {
      stagnantPasses = 0;
    }

    if (deleted % 25 === 0) {
      options.onProgress?.(
        `${name}: ${deleted} deleted, ${afterCount} remaining (target keep=${keep})`
      );
    }

    await sleep(delayMs);
  }

  const remaining = await countPagesDeployments(accountId, token, name);
  return {
    projectName: name,
    total: initialTotal,
    deleted,
    skippedActiveProduction,
    failed,
    remaining
  };
}
