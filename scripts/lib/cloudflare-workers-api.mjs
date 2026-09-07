/**
 * Cloudflare Workers deployment list/delete via REST API.
 */
import { parseCloudflareApiJson } from './cloudflare-api-json.mjs';
import { deleteSequentially } from './cloudflare-sequential-delete.mjs';

const MAX_DELETE_ATTEMPTS = 5;

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} path
 * @param {{ method?: string, body?: unknown, query?: Record<string, string> }} [options]
 */
async function cloudflareWorkersRequest(accountId, token, path, options = {}) {
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
 * @typedef {{ id: string, created_on: string }} WorkerDeploymentRecord
 */

/**
 * @param {WorkerDeploymentRecord[]} records
 * @returns {WorkerDeploymentRecord[]}
 */
export function sortWorkerDeploymentsNewestFirst(records) {
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
 * @param {{ onProgress?: (message: string) => void }} [options]
 * @returns {Promise<string[]>}
 */
export async function listWorkerScriptNames(accountId, token, options = {}) {
  const body = await withCloudflareRetry(() =>
    cloudflareWorkersRequest(accountId, token, '/workers/scripts')
  );

  const batch = Array.isArray(body.result) ? body.result : [];
  /** @type {string[]} */
  const scriptNames = [];
  for (const entry of batch) {
    const id = String(entry?.id ?? entry?.script ?? '').trim();
    if (id) scriptNames.push(id);
  }

  options.onProgress?.(`Listed ${scriptNames.length} Worker script(s)`);
  return scriptNames.sort((a, b) => a.localeCompare(b));
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} scriptName
 * @returns {Promise<WorkerDeploymentRecord[]>}
 */
export async function listWorkerDeploymentRecords(accountId, token, scriptName) {
  const script = encodeURIComponent(scriptName.trim());
  const body = await withCloudflareRetry(() =>
    cloudflareWorkersRequest(accountId, token, `/workers/scripts/${script}/deployments`)
  );
  const deployments = Array.isArray(body.result?.deployments) ? body.result.deployments : [];
  /** @type {WorkerDeploymentRecord[]} */
  const records = [];
  for (const entry of deployments) {
    const id = String(entry?.id ?? '').trim();
    if (!id) continue;
    records.push({
      id,
      created_on: String(entry?.created_on ?? '')
    });
  }
  return sortWorkerDeploymentsNewestFirst(records);
}

/**
 * @param {Error} error
 */
export function isActiveWorkerDeploymentDeleteError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /actively serving traffic|latest deployment/i.test(message);
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} scriptName
 * @param {string} deploymentId
 */
export async function deleteWorkerDeployment(accountId, token, scriptName, deploymentId) {
  const script = encodeURIComponent(scriptName.trim());
  const deployment = encodeURIComponent(deploymentId.trim());
  await withCloudflareRetry(() =>
    cloudflareWorkersRequest(
      accountId,
      token,
      `/workers/scripts/${script}/deployments/${deployment}`,
      { method: 'DELETE' }
    )
  );
}

/**
 * @param {string} scriptName
 * @param {{
 *   accountId: string,
 *   token: string,
 *   keep?: number,
 *   dryRun?: boolean,
 *   delayMs?: number,
 *   onProgress?: (message: string) => void
 * }} options
 */
export async function trimWorkerScriptDeployments(scriptName, options) {
  const accountId = options.accountId.trim();
  const token = options.token.trim();
  const name = scriptName.trim();
  const keep = Math.max(1, Number(options.keep ?? 2));
  if (!accountId || !token || !name) {
    throw new Error('trimWorkerScriptDeployments requires accountId, token, and scriptName.');
  }

  let records = await listWorkerDeploymentRecords(accountId, token, name);
  const initialTotal = records.length;
  if (records.length <= keep) {
    return {
      scriptName: name,
      total: initialTotal,
      deleted: 0,
      skippedActive: 0,
      failed: 0,
      remaining: records.length
    };
  }

  options.onProgress?.(
    `${name}: ${records.length} deployment(s); keeping ${keep} (sequential, re-checking after each pass)`
  );

  if (options.dryRun) {
    return {
      scriptName: name,
      total: initialTotal,
      deleted: 0,
      skippedActive: 0,
      failed: 0,
      remaining: records.length,
      dryRunDeleteIds: records.slice(keep).map((entry) => entry.id)
    };
  }

  let deleted = 0;
  let skippedActive = 0;
  let failed = 0;

  while (records.length > keep) {
    const beforeCount = records.length;
    const toDelete = records.slice(keep);
    const ordered = [...toDelete].reverse();
    const pass = await deleteSequentially(
      ordered,
      (entry) => deleteWorkerDeployment(accountId, token, name, entry.id),
      {
        delayMs: options.delayMs ?? 500,
        continueOnError: true,
        shouldSkip: isActiveWorkerDeploymentDeleteError,
        onProgress: options.onProgress,
        progressEvery: 5
      }
    );
    deleted += pass.deleted;
    skippedActive += pass.skipped;
    failed += pass.failed;

    records = await listWorkerDeploymentRecords(accountId, token, name);
    if (records.length >= beforeCount && pass.deleted === 0 && pass.skipped === 0) {
      options.onProgress?.(
        `${name}: delete pass made no progress (${records.length} still listed); stopping`
      );
      break;
    }
    if (records.length <= keep) {
      break;
    }
  }

  return {
    scriptName: name,
    total: initialTotal,
    deleted,
    skippedActive,
    failed,
    remaining: records.length
  };
}
