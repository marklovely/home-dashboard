import { parseEmailList, validateEmailList } from '../../lib/emailLists.js';
import { resolveCloudflareAccountId } from './platformCloudflareUsage.js';
import { operatorEmailAllowlist } from './platformApi.js';

/** @typedef {Record<string, string | undefined>} PlatformEnv */

const CF_API_BASE = 'https://api.cloudflare.com/client/v4';
export const MARKETING_ACCESS_APP_NAME = 'Lovely Home — Marketing site';
export const MARKETING_ACCESS_POLICY_NAME = 'Platform operators';

/**
 * @param {PlatformEnv} env
 * @param {Record<string, unknown>} [platform]
 */
export function marketingAccessApiConfigured(env, platform = {}) {
  return Boolean(resolveCloudflareAccountId(env, platform) && env.PLATFORM_CF_API_TOKEN?.trim());
}

/**
 * @param {unknown} include
 * @returns {string[]}
 */
export function emailsFromAccessInclude(include) {
  if (!Array.isArray(include)) return [];
  /** @type {string[]} */
  const emails = [];
  for (const rule of include) {
    const email = /** @type {{ email?: { email?: string } }} */ (rule)?.email?.email;
    if (email?.trim()) emails.push(email.trim().toLowerCase());
  }
  return [...new Set(emails)].sort();
}

/**
 * @param {string[]} emails
 */
export function accessIncludeFromEmails(emails) {
  return parseEmailList(emails).map((email) => ({ email: { email } }));
}

/**
 * @param {string[]} operators
 * @param {string[]} allowed
 */
export function splitMarketingAccessEmails(operators, allowed) {
  const operatorSet = new Set(parseEmailList(operators));
  const all = parseEmailList(allowed);
  return {
    operators: all.filter((email) => operatorSet.has(email)),
    guests: all.filter((email) => !operatorSet.has(email))
  };
}

/**
 * Keep operators, then add the guest.
 *
 * @param {string[]} operators
 * @param {string[]} current
 * @param {string} email
 */
export function emailsAfterAddingGuest(operators, current, email) {
  const parsed = parseEmailList([email]);
  if (parsed.length !== 1) {
    return [...new Set([...parseEmailList(operators), ...parseEmailList(current)])].sort();
  }
  return [...new Set([...parseEmailList(operators), ...parseEmailList(current), parsed[0]])].sort();
}

/**
 * @param {string[]} operators
 * @param {string[]} current
 * @param {string} email
 */
export function emailsAfterRemovingGuest(operators, current, email) {
  const operatorSet = new Set(parseEmailList(operators));
  const target = parseEmailList([email])[0];
  if (!target || operatorSet.has(target)) {
    return [...new Set([...parseEmailList(operators), ...parseEmailList(current)])].sort();
  }
  return [...new Set([...parseEmailList(operators), ...parseEmailList(current).filter((row) => row !== target)])].sort();
}

/**
 * @param {PlatformEnv} env
 * @param {Record<string, unknown>} platform
 * @param {typeof fetch} [fetchImpl]
 */
export async function getMarketingAccess(env, platform = {}, fetchImpl = fetch) {
  const origin = String(env.MARKETING_SITE_ORIGIN?.trim() || platform.marketingSiteOrigin || 'https://lovely-home.co.uk');
  const operators = operatorEmailAllowlist(env);

  if (!marketingAccessApiConfigured(env, platform)) {
    return {
      ok: false,
      code: 'NOT_CONFIGURED',
      origin,
      operators,
      guests: [],
      emails: operators,
      message:
        'Set PLATFORM_CF_API_TOKEN with Access: Apps and Policies Edit (and Account Read) plus CLOUDFLARE_ACCOUNT_ID on the platform Pages project.'
    };
  }

  try {
    const app = await resolveMarketingAccessApp(env, platform, fetchImpl);
    if (!app) {
      return {
        ok: true,
        protected: false,
        origin,
        operators,
        guests: [],
        emails: operators,
        message:
          'No marketing Access app found. The pre-launch gate is off, or terraform has not created Lovely Home — Marketing site yet.'
      };
    }

    const policies = await listAccessPolicies(env, platform, app.id, fetchImpl);
    const policy = findMarketingPolicy(policies);
    const allowed = emailsFromAccessInclude(policy?.include);
    const split = splitMarketingAccessEmails(operators, allowed.length ? allowed : operators);
    return {
      ok: true,
      protected: true,
      origin,
      appId: app.id,
      appName: app.name,
      operators: split.operators,
      guests: split.guests,
      emails: [...new Set([...split.operators, ...split.guests])].sort()
    };
  } catch (error) {
    return {
      ok: false,
      code: 'CLOUDFLARE_ERROR',
      origin,
      operators,
      guests: [],
      emails: operators,
      message: error instanceof Error ? error.message : 'Could not read marketing Access.'
    };
  }
}

/**
 * @param {PlatformEnv} env
 * @param {Record<string, unknown>} platform
 * @param {'add' | 'remove'} action
 * @param {string} email
 * @param {typeof fetch} [fetchImpl]
 */
export async function updateMarketingAccess(env, platform, action, email, fetchImpl = fetch) {
  const invalid = validateEmailList([email], { required: true });
  if (invalid) {
    return { ok: false, code: 'INVALID_EMAIL', message: invalid };
  }

  const current = await getMarketingAccess(env, platform, fetchImpl);
  if (!current.ok) return current;
  if (current.protected === false) {
    return {
      ...current,
      ok: false,
      code: 'NOT_PROTECTED',
      message: current.message
    };
  }

  const operators = current.operators ?? [];
  const allowed = current.emails ?? [];
  const next =
    action === 'add'
      ? emailsAfterAddingGuest(operators, allowed, email)
      : emailsAfterRemovingGuest(operators, allowed, email);

  if (action === 'remove') {
    const target = parseEmailList([email])[0];
    if (operators.includes(target)) {
      return {
        ok: false,
        code: 'OPERATOR_LOCKED',
        message: 'Platform operators stay on the marketing list. Remove them from platform_operator_emails in hub.tfvars instead.'
      };
    }
  }

  await putMarketingPolicyEmails(env, platform, String(current.appId), next, fetchImpl);
  return getMarketingAccess(env, platform, fetchImpl);
}

/**
 * @param {Array<Record<string, unknown>>} policies
 */
function findMarketingPolicy(policies) {
  return (
    policies.find((policy) => policy.name === MARKETING_ACCESS_POLICY_NAME) ||
    policies.find((policy) => policy.decision === 'allow') ||
    null
  );
}

/**
 * @param {PlatformEnv} env
 * @param {Record<string, unknown>} platform
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<{ id: string, name: string } | null>}
 */
async function resolveMarketingAccessApp(env, platform, fetchImpl) {
  const configured = env.MARKETING_ACCESS_APP_ID?.trim() || String(platform.marketingAccessAppId ?? '').trim();
  if (configured) {
    return { id: configured, name: MARKETING_ACCESS_APP_NAME };
  }

  const accountId = resolveCloudflareAccountId(env, platform);
  const token = env.PLATFORM_CF_API_TOKEN?.trim();
  const response = await fetchImpl(`${CF_API_BASE}/accounts/${accountId}/access/apps?per_page=100`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(`Access app list failed (${response.status})`);
  }
  const apps = /** @type {Array<{ id?: string, name?: string }>} */ (payload.result ?? []);
  const match = apps.find((app) => app.name === MARKETING_ACCESS_APP_NAME);
  if (!match?.id) return null;
  return { id: match.id, name: match.name ?? MARKETING_ACCESS_APP_NAME };
}

/**
 * @param {PlatformEnv} env
 * @param {Record<string, unknown>} platform
 * @param {string} appId
 * @param {typeof fetch} fetchImpl
 */
async function listAccessPolicies(env, platform, appId, fetchImpl) {
  const accountId = resolveCloudflareAccountId(env, platform);
  const token = env.PLATFORM_CF_API_TOKEN?.trim();
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
 * @param {PlatformEnv} env
 * @param {Record<string, unknown>} platform
 * @param {string} appId
 * @param {string[]} emails
 * @param {typeof fetch} fetchImpl
 */
async function putMarketingPolicyEmails(env, platform, appId, emails, fetchImpl) {
  const accountId = resolveCloudflareAccountId(env, platform);
  const token = env.PLATFORM_CF_API_TOKEN?.trim();
  const policies = await listAccessPolicies(env, platform, appId, fetchImpl);
  const existing = findMarketingPolicy(policies);
  const include = accessIncludeFromEmails(emails);

  if (existing?.id) {
    const body = {
      name: String(existing.name || MARKETING_ACCESS_POLICY_NAME),
      decision: 'allow',
      include,
      precedence: existing.precedence ?? 1
    };
    if (Array.isArray(existing.exclude) && existing.exclude.length) body.exclude = existing.exclude;
    if (Array.isArray(existing.require) && existing.require.length) body.require = existing.require;
    if (existing.session_duration) body.session_duration = existing.session_duration;
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

  const response = await fetchImpl(`${CF_API_BASE}/accounts/${accountId}/access/apps/${appId}/policies`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: MARKETING_ACCESS_POLICY_NAME,
      decision: 'allow',
      precedence: 1,
      include
    })
  });
  const payload = await response.json();
  if (!response.ok || !payload?.success) {
    throw new Error(`Access policy create failed (${response.status})`);
  }
}
