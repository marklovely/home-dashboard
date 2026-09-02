#!/usr/bin/env node
/**
 * Update the Zero Trust Access login screen (team-wide): cottage mark + copy that
 * an unauthorised email will not receive a code.
 *
 * Usage: node scripts/sync-access-login-design.mjs
 * Requires: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID
 */
import { applyLocalHubEnv } from './lib/load-local-hub-env.mjs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export const ACCESS_LOGIN_LOGO_URL =
  'https://raw.githubusercontent.com/marklovely/home-dashboard/main/website/favicon.png';

export const ACCESS_LOGIN_FOOTER_TEXT =
  'If you do not receive a code, this email is not authorised for this home. Ask the owner to add you.';

export const ACCESS_UNAUTHORISED_URL = 'https://lovely-home.co.uk/access-unauthorised.html';

export const ACCESS_UNAUTHORISED_MESSAGE =
  'You are not authorised to access this home. If you did not receive a login code, this email is not on the household list.';

const ACCESS_LOGIN_GENERIC_NAMES = {
  production: 'Lovely Home',
  prod: 'Lovely Home',
  sandbox: 'Sandbox Home',
  test: 'Test Home',
  demo: 'Demo Home',
  dev: 'Dev Home',
  staging: 'Staging Home'
};

const LOGIN_DESIGN = {
  logo_path: ACCESS_LOGIN_LOGO_URL,
  footer_text: ACCESS_LOGIN_FOOTER_TEXT
};

const LEGACY_PAGES_APP = /^Lovely Home — ([a-z0-9_-]+) Pages$/i;
const LEGACY_WORKER_APP = /^Lovely Home — ([a-z0-9_-]+) Worker$/i;

/**
 * @param {unknown} siteId
 * @param {'pages' | 'worker'} [kind]
 */
export function accessLoginAppName(siteId, kind = 'pages') {
  const id = String(siteId ?? '')
    .trim()
    .toLowerCase();
  const titled = id
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  const generic = ACCESS_LOGIN_GENERIC_NAMES[id];
  const label = generic || (/\bhome$/i.test(titled) ? titled : titled ? `${titled} Home` : 'Home Hub');
  return kind === 'worker' ? `${label} API` : label;
}

/**
 * @param {unknown} currentName
 * @returns {{ siteId: string, kind: 'pages' | 'worker', name: string } | null}
 */
export function hubAccessAppFromLegacyName(currentName) {
  const name = String(currentName ?? '').trim();
  const pages = name.match(LEGACY_PAGES_APP);
  if (pages) {
    return { siteId: pages[1].toLowerCase(), kind: 'pages', name: accessLoginAppName(pages[1], 'pages') };
  }
  const worker = name.match(LEGACY_WORKER_APP);
  if (worker) {
    return { siteId: worker[1].toLowerCase(), kind: 'worker', name: accessLoginAppName(worker[1], 'worker') };
  }
  return null;
}

/**
 * @param {string} name
 */
export function accessAppLoginFields(name) {
  return {
    name,
    logo_url: ACCESS_LOGIN_LOGO_URL,
    custom_deny_url: ACCESS_UNAUTHORISED_URL,
    custom_deny_message: ACCESS_UNAUTHORISED_MESSAGE,
    custom_non_identity_deny_url: ACCESS_UNAUTHORISED_URL
  };
}

/**
 * @param {Record<string, unknown>} organization
 */
export function mergeAccessLoginDesign(organization) {
  const current =
    organization.login_design && typeof organization.login_design === 'object'
      ? /** @type {Record<string, unknown>} */ (organization.login_design)
      : {};
  return {
    ...organization,
    login_design: {
      ...current,
      ...LOGIN_DESIGN
    }
  };
}

async function main() {
  applyLocalHubEnv(join(root, 'terraform/environments/hub.tfvars'));
  if (!process.env.CLOUDFLARE_API_TOKEN?.trim() && process.env.PLATFORM_CF_API_TOKEN?.trim()) {
    process.env.CLOUDFLARE_API_TOKEN = process.env.PLATFORM_CF_API_TOKEN;
  }

  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!token || !accountId) {
    console.error('CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID are required.');
    process.exit(1);
  }

  /**
   * @param {string} path
   * @param {string} [method]
   * @param {unknown} [payload]
   */
  async function cf(path, method = 'GET', payload) {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: payload === undefined ? undefined : JSON.stringify(payload)
    });
    const body = await response.json();
    if (!body.success) {
      const msg = body.errors?.map((error) => error.message).join('; ') ?? JSON.stringify(body.errors);
      throw new Error(`${method} ${path} failed: ${msg}`);
    }
    return body.result;
  }

  const current = await cf('/access/organizations');
  const next = mergeAccessLoginDesign(current);
  await cf('/access/organizations', 'PUT', {
    name: next.name,
    auth_domain: next.auth_domain,
    login_design: next.login_design
  });
  console.log('Updated Access login design (logo + unauthorised-email footer).');

  /** @type {unknown[]} */
  const apps = (await cf('/access/apps?per_page=100')) ?? [];
  for (const app of apps) {
    const record = /** @type {{
      id?: string,
      name?: string,
      type?: string,
      domain?: string,
      destinations?: unknown,
      session_duration?: string
    }} */ (app);
    const rename = hubAccessAppFromLegacyName(record.name);
    if (!rename || !record.id) continue;
    const fields = accessAppLoginFields(rename.name);
    await cf(`/access/apps/${record.id}`, 'PUT', {
      type: record.type || 'self_hosted',
      domain: record.domain,
      destinations: record.destinations,
      session_duration: record.session_duration,
      ...fields
    });
    console.log(`Renamed Access app ${record.name} → ${rename.name} (${record.domain ?? record.id}).`);
  }
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
