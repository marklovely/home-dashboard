import { existsSync, readFileSync } from 'node:fs';

/** @type {Record<string, string>} */
const STRING_FIELD_TO_ENV = {
  cloudflare_account_id: 'CLOUDFLARE_ACCOUNT_ID',
  cloudflare_zone_id: 'CLOUDFLARE_ZONE_ID',
  customer_cloudflare_zone_id: 'CUSTOMER_CLOUDFLARE_ZONE_ID',
  customer_zone_name: 'CUSTOMER_ZONE_NAME',
  workers_subdomain: 'WORKERS_SUBDOMAIN',
  access_team_domain: 'ACCESS_TEAM_DOMAIN',
  zone_name: 'ZONE_NAME',
  platform_github_token: 'PLATFORM_GITHUB_TOKEN'
};

/**
 * @param {string} text
 * @returns {{ strings: Record<string, string>, lists: Record<string, string[]> }}
 */
export function parseHubTfvarsText(text) {
  /** @type {Record<string, string>} */
  const strings = {};
  /** @type {Record<string, string[]>} */
  const lists = {};

  for (const field of Object.keys(STRING_FIELD_TO_ENV)) {
    const match = text.match(new RegExp(`^\\s*${field}\\s*=\\s*"([^"]*)"\\s*$`, 'm'));
    if (match) strings[field] = match[1];
  }

  for (const field of ['owner_emails', 'sitter_emails', 'platform_operator_emails']) {
    const block = text.match(new RegExp(`${field}\\s*=\\s*\\[([^\\]]*)\\]`, 's'));
    if (!block) continue;
    const emails = [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]).filter(Boolean);
    if (emails.length) lists[field] = emails;
  }

  return { strings, lists };
}

/**
 * Fill missing generate-hub-tfvars env vars from terraform/environments/hub.tfvars.
 *
 * @param {string} hubTfvarsPath
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {boolean} Whether hub.tfvars was found and parsed
 */
export function applyLocalHubEnv(hubTfvarsPath, env = process.env) {
  if (!existsSync(hubTfvarsPath)) return false;

  const { strings, lists } = parseHubTfvarsText(readFileSync(hubTfvarsPath, 'utf8'));

  for (const [field, value] of Object.entries(strings)) {
    const envKey = STRING_FIELD_TO_ENV[field];
    if (!env[envKey]?.trim()) env[envKey] = value;
  }

  if (!env.OWNER_EMAILS?.trim() && lists.owner_emails?.length) {
    env.OWNER_EMAILS = lists.owner_emails.join(',');
  }
  if (!env.SITTER_EMAILS?.trim() && lists.sitter_emails?.length) {
    env.SITTER_EMAILS = lists.sitter_emails.join(',');
  }
  if (!env.PLATFORM_OPERATOR_EMAILS?.trim() && lists.platform_operator_emails?.length) {
    env.PLATFORM_OPERATOR_EMAILS = lists.platform_operator_emails.join(',');
  }

  return true;
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string[]}
 */
export function missingProvisionEnvKeys(env = process.env) {
  /** @type {string[]} */
  const missing = [];
  for (const envKey of [
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_ZONE_ID',
    'WORKERS_SUBDOMAIN',
    'ACCESS_TEAM_DOMAIN'
  ]) {
    if (!env[envKey]?.trim()) missing.push(envKey);
  }
  return missing;
}
