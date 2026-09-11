#!/usr/bin/env node
/**
 * Restore a reprovisioned hub from the platform archive in R2 (returning customers).
 *
 * Usage: node scripts/restore-hub-site-from-archive.mjs <site_id>
 */
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PLATFORM_ARCHIVE_R2_BUCKET_NAME
} from './lib/platform-archive-storage.mjs';
import { fetchBillingArchiveState } from './lib/fetch-billing-archive-state.mjs';
import { getR2ObjectText } from './lib/cloudflare-r2-api.mjs';
import { resolveHubPlatformApiUrl } from './lib/hub-archive-url.mjs';
import { readSiteContract } from './lib/read-site-contract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/restore-hub-site-from-archive.mjs <site_id>');
  process.exit(1);
}

const archiveSecret = process.env.PLATFORM_SITE_ARCHIVE_SECRET?.trim();
const bucket = process.env.PLATFORM_ARCHIVE_R2_BUCKET?.trim() || PLATFORM_ARCHIVE_R2_BUCKET_NAME;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? '';
const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? '';

if (!archiveSecret) {
  console.error('PLATFORM_SITE_ARCHIVE_SECRET is not set — cannot restore from platform archive.');
  process.exit(1);
}

const HEALTH_RETRIES = 12;
const HEALTH_RETRY_DELAY_MS = 10_000;
const RESTORE_RETRIES = 3;
const RESTORE_RETRY_DELAY_MS = 5000;

/**
 * @returns {{ clientId: string, clientSecret: string } | null}
 */
function readAccessServiceAuth() {
  const clientId = process.env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret = process.env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

/**
 * @param {string} url
 * @param {RequestInit} [init]
 */
async function hubPlatformFetch(url, init = {}) {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json',
    'X-Platform-Site-Archive-Secret': archiveSecret,
    ...(init.headers && typeof init.headers === 'object' && !(init.headers instanceof Headers)
      ? init.headers
      : {})
  };

  const auth = readAccessServiceAuth();
  if (auth) {
    headers['CF-Access-Client-Id'] = auth.clientId;
    headers['CF-Access-Client-Secret'] = auth.clientSecret;
  }

  return fetch(url, { ...init, headers, redirect: 'manual' });
}

/**
 * @param {string} healthUrl
 */
async function waitForHubHealth(healthUrl) {
  /** @type {Error | null} */
  let lastError = null;
  for (let attempt = 1; attempt <= HEALTH_RETRIES; attempt += 1) {
    try {
      const response = await hubPlatformFetch(healthUrl, { method: 'GET' });
      if (response.status >= 300 && response.status < 400) {
        throw new Error(`Cloudflare Access redirect (${response.status}) — set PLATFORM_HEALTH_CF_ACCESS_*`);
      }
      if (!response.ok) {
        throw new Error(`Health check HTTP ${response.status}`);
      }
      const body = await response.json();
      if (body?.status !== 'ok' && body?.ok !== true) {
        throw new Error(`Unexpected health body: ${JSON.stringify(body)}`);
      }
      console.log(`Hub health OK (${healthUrl})`);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= HEALTH_RETRIES) break;
      console.warn(
        `Hub not ready (attempt ${attempt}/${HEALTH_RETRIES}): ${lastError.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, HEALTH_RETRY_DELAY_MS));
    }
  }
  throw lastError ?? new Error('Hub health check failed.');
}

/**
 * @param {string} restoreUrl
 * @param {Record<string, unknown>} payload
 */
async function postPlatformRestore(restoreUrl, payload) {
  /** @type {Error | null} */
  let lastError = null;
  for (let attempt = 1; attempt <= RESTORE_RETRIES; attempt += 1) {
    try {
      const response = await hubPlatformFetch(restoreUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.status >= 300 && response.status < 400) {
        throw new Error(`Cloudflare Access redirect (${response.status}) — set PLATFORM_HEALTH_CF_ACCESS_*`);
      }
      const text = await response.text();
      if (!response.ok) {
        const error = new Error(`Restore failed (${response.status}): ${text.slice(0, 500)}`);
        error.status = response.status;
        throw error;
      }
      const body = JSON.parse(text);
      if (!body?.ok) {
        throw new Error(`Restore response missing ok: ${text.slice(0, 500)}`);
      }
      return body;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable =
        lastError.status === undefined || lastError.status >= 500 || lastError.status === 429;
      if (!retryable || attempt >= RESTORE_RETRIES) {
        throw lastError;
      }
      console.warn(
        `Restore attempt ${attempt}/${RESTORE_RETRIES} failed: ${lastError.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, RESTORE_RETRY_DELAY_MS));
    }
  }
  throw lastError ?? new Error('Restore failed.');
}

console.log(`\n=== Restore hub from platform archive: ${siteId} ===`);

const billing = fetchBillingArchiveState(siteId);
if (!billing?.archiveR2Key) {
  console.log('No platform archive on billing row — skipping automated restore.');
  process.exit(0);
}

if (billing.archiveRestoredAt) {
  console.log(
    `Archive already restored at ${new Date(billing.archiveRestoredAt).toISOString()} — skipping.`
  );
  process.exit(0);
}

if (!accountId || !cfToken) {
  console.error('CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required to read platform R2.');
  process.exit(1);
}

console.log(`Loading archive object: r2://${bucket}/${billing.archiveR2Key}`);
const raw = await getR2ObjectText(bucket, billing.archiveR2Key, { accountId, token: cfToken });
if (!raw) {
  console.error(`Archive object not found: ${billing.archiveR2Key}`);
  process.exit(1);
}

/** @type {Record<string, unknown>} */
let payload;
try {
  payload = JSON.parse(raw);
} catch {
  console.error('Archive object is not valid JSON.');
  process.exit(1);
}

const resolved = readSiteContract(siteId);
if (!resolved) {
  console.error(`Could not resolve restore target for site "${siteId}".`);
  process.exit(1);
}

/** @type {{ url: string, via: string }[]} */
const targets = [];
const primary = resolveHubPlatformApiUrl(resolved.site, 'site-restore');
if (primary.url) targets.push({ url: primary.url, via: primary.via });

const workerOrigin = String(resolved.site.worker_api_origin ?? '')
  .trim()
  .replace(/\/$/, '');
if (workerOrigin) {
  const healthUrl = `${workerOrigin}/api/health`;
  await waitForHubHealth(healthUrl);
}

/** @type {Error | null} */
let restoreError = null;
for (const target of targets) {
  console.log(`Restoring via ${target.via}: ${target.url}`);
  try {
    const result = await postPlatformRestore(target.url, payload);
    console.log(`Restore complete (${result.restoreSource ?? 'platform'}).`);
    restoreError = null;
    break;
  } catch (error) {
    restoreError = error instanceof Error ? error : new Error(String(error));
    console.warn(`Restore via ${target.via} failed: ${restoreError.message}`);
  }
}

if (restoreError) {
  console.error(restoreError.message);
  process.exit(1);
}

execFileSync('node', ['scripts/mark-billing-archive-restored.mjs', siteId], {
  cwd: root,
  stdio: 'inherit',
  env: process.env
});

console.log(`\n=== Archive restore complete: ${siteId} ===`);
