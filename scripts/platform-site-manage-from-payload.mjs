#!/usr/bin/env node
/**
 * Apply platform-site-manage from validated JSON payload (GitHub Actions).
 * Avoids shell interpolation of untrusted workflow inputs.
 */
import { appendFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateHostname, validateSiteId } from './lib/site-registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manageScript = join(root, 'scripts/platform-site-manage.mjs');
const allowedActions = new Set(['create', 'update', 'delete']);

const action = String(process.env.SITE_MANAGE_ACTION ?? '').trim();
if (!allowedActions.has(action)) {
  console.error(`Invalid action: ${action}`);
  process.exit(1);
}

/** @type {Record<string, unknown>} */
let payload;
try {
  payload = JSON.parse(process.env.SITE_MANAGE_PAYLOAD ?? '{}');
} catch {
  console.error('Invalid JSON payload.');
  process.exit(1);
}

const siteId = String(payload.siteId ?? '').trim();
const idError = validateSiteId(siteId);
if (idError) {
  console.error(idError);
  process.exit(1);
}

if (payload.hostname !== undefined) {
  const hostError = validateHostname(String(payload.hostname));
  if (hostError) {
    console.error(hostError);
    process.exit(1);
  }
}

if (payload.hub_environment !== undefined) {
  const hubError = validateSiteId(String(payload.hub_environment));
  if (hubError) {
    console.error(`hub_environment: ${hubError}`);
    process.exit(1);
  }
}

/** @type {string[]} */
const args = [manageScript, action, '--site-id', siteId];

if (payload.hostname !== undefined) args.push('--hostname', String(payload.hostname));
if (payload.hub_environment !== undefined) args.push('--hub-environment', String(payload.hub_environment));
if (payload.vanilla !== undefined) args.push('--vanilla', String(payload.vanilla));
if (payload.terraform !== undefined) args.push('--terraform', String(payload.terraform));
if (payload.attach_hub_api_binding !== undefined) {
  args.push('--attach-hub-api-binding', String(payload.attach_hub_api_binding));
}
if (payload.owner_emails !== undefined) {
  const emails = Array.isArray(payload.owner_emails)
    ? payload.owner_emails.join(',')
    : String(payload.owner_emails);
  args.push('--owner-emails', emails);
}
if (payload.sitter_emails !== undefined) {
  const emails = Array.isArray(payload.sitter_emails)
    ? payload.sitter_emails.join(',')
    : String(payload.sitter_emails);
  args.push('--sitter-emails', emails);
}
if (payload.zone_name !== undefined) {
  args.push('--zone-name', String(payload.zone_name));
}
if (payload.confirm_hostname !== undefined) {
  args.push('--confirm-hostname', String(payload.confirm_hostname));
}

const result = spawnSync(process.execPath, args, { stdio: 'inherit', cwd: root });
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const githubOutput = process.env.GITHUB_OUTPUT;
if (githubOutput) {
  appendFileSync(githubOutput, `site_id=${siteId}\n`);
}
