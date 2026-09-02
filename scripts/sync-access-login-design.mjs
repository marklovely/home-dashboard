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

const LOGIN_DESIGN = {
  logo_path: ACCESS_LOGIN_LOGO_URL,
  footer_text: ACCESS_LOGIN_FOOTER_TEXT
};

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
}

const invokedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
