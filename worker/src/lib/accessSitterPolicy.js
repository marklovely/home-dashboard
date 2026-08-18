import { parseEmailList } from './emailLists.js';

const SITTER_POLICY_NAME = 'House sitters';
const CF_API_BASE = 'https://api.cloudflare.com/client/v4';

/**
 * @param {Record<string, string | undefined>} env
 */
export function isAccessSitterSyncConfigured(env) {
  return Boolean(
    env.CLOUDFLARE_ACCOUNT_ID?.trim() &&
      env.ACCESS_PAGES_APP_ID?.trim() &&
      env.ACCESS_WORKER_APP_ID?.trim() &&
      env.CF_ACCESS_MANAGEMENT_TOKEN?.trim()
  );
}

/**
 * @param {string[]} emails
 */
export function buildSitterPolicyInclude(emails) {
  return parseEmailList(emails).map((email) => ({ email: { email } }));
}

/**
 * @param {unknown} include
 * @returns {string[]}
 */
export function parseSitterEmailsFromPolicyInclude(include) {
  if (!Array.isArray(include)) return [];
  /** @type {string[]} */
  const emails = [];
  for (const rule of include) {
    const email = /** @type {{ email?: { email?: string } }} */ (rule)?.email?.email;
    if (email?.trim()) emails.push(email.trim().toLowerCase());
  }
  return emails;
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} appId
 * @param {typeof fetch} fetchImpl
 */
async function listAccessPolicies(env, appId, fetchImpl) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = env.CF_ACCESS_MANAGEMENT_TOKEN?.trim();
  const response = await fetchImpl(
    `${CF_API_BASE}/accounts/${accountId}/access/apps/${appId}/policies?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json'
      }
    }
  );
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(`Access policy list failed (${response.status})`);
  }
  return /** @type {Array<Record<string, unknown>>} */ (payload.result ?? []);
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string} appId
 * @param {string[]} emails
 * @param {typeof fetch} fetchImpl
 */
async function syncSitterPolicyForApp(env, appId, emails, fetchImpl) {
  const accountId = env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = env.CF_ACCESS_MANAGEMENT_TOKEN?.trim();
  const policies = await listAccessPolicies(env, appId, fetchImpl);
  const existing = policies.find((policy) => policy.name === SITTER_POLICY_NAME);
  const include = buildSitterPolicyInclude(emails);

  if (include.length === 0) {
    if (!existing?.id) return;
    const response = await fetchImpl(
      `${CF_API_BASE}/accounts/${accountId}/access/apps/${appId}/policies/${existing.id}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      }
    );
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(`Access policy delete failed (${response.status})`);
    }
    return;
  }

  if (existing?.id) {
    const body = {
      ...existing,
      name: SITTER_POLICY_NAME,
      decision: 'allow',
      include
    };
    delete body.created_at;
    delete body.updated_at;

    const response = await fetchImpl(
      `${CF_API_BASE}/accounts/${accountId}/access/apps/${appId}/policies/${existing.id}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      }
    );
    const payload = await response.json();
    if (!response.ok || !payload?.success) {
      throw new Error(`Access policy update failed (${response.status})`);
    }
    return;
  }

  const maxPrecedence = policies.reduce(
    (max, policy) => Math.max(max, Number(policy.precedence ?? 0)),
    0
  );
  const response = await fetchImpl(
    `${CF_API_BASE}/accounts/${accountId}/access/apps/${appId}/policies`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: SITTER_POLICY_NAME,
        decision: 'allow',
        precedence: maxPrecedence + 1,
        include
      })
    }
  );
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(`Access policy create failed (${response.status})`);
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {string[]} emails
 * @param {typeof fetch} fetchImpl
 */
export async function syncSitterEmailsToAccess(env, emails, fetchImpl = fetch) {
  if (!isAccessSitterSyncConfigured(env)) {
    return { ok: false, code: 'ACCESS_SYNC_NOT_CONFIGURED' };
  }

  const pagesAppId = env.ACCESS_PAGES_APP_ID?.trim();
  const workerAppId = env.ACCESS_WORKER_APP_ID?.trim();
  if (!pagesAppId || !workerAppId) {
    return { ok: false, code: 'ACCESS_SYNC_NOT_CONFIGURED' };
  }

  try {
    await syncSitterPolicyForApp(env, pagesAppId, emails, fetchImpl);
    await syncSitterPolicyForApp(env, workerAppId, emails, fetchImpl);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, code: 'ACCESS_SYNC_FAILED', message };
  }
}

/**
 * @param {Record<string, string | undefined>} env
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<string[]>}
 */
export async function readSitterEmailsFromAccess(env, fetchImpl = fetch) {
  if (!isAccessSitterSyncConfigured(env)) return [];

  const pagesAppId = env.ACCESS_PAGES_APP_ID?.trim();
  if (!pagesAppId) return [];

  try {
    const policies = await listAccessPolicies(env, pagesAppId, fetchImpl);
    const sitterPolicy = policies.find((policy) => policy.name === SITTER_POLICY_NAME);
    return parseSitterEmailsFromPolicyInclude(sitterPolicy?.include);
  } catch {
    return [];
  }
}
