#!/usr/bin/env node
/**
 * Export a full site backup from a live hub before deprovision and store in platform R2.
 *
 * Usage: node scripts/archive-hub-site-backup.mjs <site_id>
 */
import {
  PLATFORM_ARCHIVE_R2_BUCKET_NAME,
  uploadSiteArchiveToR2
} from './lib/platform-archive-storage.mjs';
import { readRecentSiteArchivePointer } from './lib/platform-archive-reuse.mjs';
import { resolveHubArchiveUrl } from './lib/hub-archive-url.mjs';
import { resolveSiteArchiveContract } from './lib/resolve-site-archive-contract.mjs';

const siteId = process.argv[2]?.trim();
if (!siteId) {
  console.error('Usage: node scripts/archive-hub-site-backup.mjs <site_id>');
  process.exit(1);
}

const archiveSecret = process.env.PLATFORM_SITE_ARCHIVE_SECRET?.trim();
const bucket = process.env.PLATFORM_ARCHIVE_R2_BUCKET?.trim() || PLATFORM_ARCHIVE_R2_BUCKET_NAME;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? '';
const cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? '';

if (!archiveSecret) {
  console.error(
    'PLATFORM_SITE_ARCHIVE_SECRET is not set — refusing to deprovision without a hub backup.'
  );
  process.exit(1);
}

const ARCHIVE_FETCH_RETRIES = 3;
const ARCHIVE_FETCH_RETRY_DELAY_MS = 5000;

/**
 * @param {string} url
 */
async function fetchArchivePayload(url) {
  /** @type {Record<string, string>} */
  const headers = {
    Accept: 'application/json',
    'X-Platform-Site-Archive-Secret': archiveSecret
  };

  const clientId = process.env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID?.trim();
  const clientSecret = process.env.PLATFORM_HEALTH_CF_ACCESS_CLIENT_SECRET?.trim();
  if (clientId && clientSecret) {
    headers['CF-Access-Client-Id'] = clientId;
    headers['CF-Access-Client-Secret'] = clientSecret;
  }

  const response = await fetch(url, { headers, redirect: 'manual' });
  if (response.status >= 300 && response.status < 400) {
    console.error(
      `Archive fetch blocked by Cloudflare Access (${response.status}). Set PLATFORM_HEALTH_CF_ACCESS_CLIENT_ID/SECRET.`
    );
    process.exit(1);
  }

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Archive fetch failed (${response.status}): ${body.slice(0, 500)}`);
    error.status = response.status;
    throw error;
  }

  return /** @type {Record<string, unknown>} */ (await response.json());
}

/**
 * @param {string} url
 * @param {string} via
 */
async function fetchArchivePayloadWithRetries(url, via) {
  /** @type {Error | null} */
  let lastError = null;
  for (let attempt = 1; attempt <= ARCHIVE_FETCH_RETRIES; attempt += 1) {
    try {
      return await fetchArchivePayload(url);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const retryable =
        lastError.status === undefined ||
        lastError.status >= 500 ||
        lastError.status === 429;
      if (!retryable || attempt >= ARCHIVE_FETCH_RETRIES) {
        throw lastError;
      }
      console.warn(
        `Archive fetch via ${via} failed (attempt ${attempt}/${ARCHIVE_FETCH_RETRIES}): ${lastError.message}`
      );
      await new Promise((resolve) => setTimeout(resolve, ARCHIVE_FETCH_RETRY_DELAY_MS));
    }
  }
  throw lastError ?? new Error('Archive fetch failed.');
}

/**
 * @param {Record<string, unknown>} site
 * @returns {{ url: string, via: string }[]}
 */
function archiveFetchTargets(site) {
  const primary = resolveHubArchiveUrl(site);
  /** @type {{ url: string, via: string }[]} */
  const targets = [];
  if (primary.url) targets.push({ url: primary.url, via: primary.via });

  const hostname = String(site.hostname ?? '').trim();
  const pages = resolveHubArchiveUrl({ hostname });
  if (pages.url && !targets.some((target) => target.url === pages.url)) {
    targets.push({ url: pages.url, via: pages.via });
  }
  return targets;
}

console.log(`\n=== Archiving hub site backup: ${siteId} ===`);

const resolved = resolveSiteArchiveContract(siteId);
if (!resolved) {
  console.error(`Could not resolve archive target for site "${siteId}" (terraform, manifest, or registry).`);
  process.exit(1);
}
if (resolved.source !== 'terraform') {
  console.warn(
    `Using ${resolved.source} fallback for archive target (terraform output sites missing or incomplete).`
  );
}

const targets = archiveFetchTargets(resolved.site);
if (targets.length === 0) {
  console.error(`No worker_api_origin or hostname available for "${siteId}".`);
  process.exit(1);
}

/** @type {Record<string, unknown> | null} */
let payload = null;
/** @type {Error | null} */
let fetchError = null;

for (const target of targets) {
  console.log(`Fetching archive via ${target.via}: ${target.url}`);
  try {
    payload = await fetchArchivePayloadWithRetries(target.url, target.via);
    fetchError = null;
    break;
  } catch (error) {
    fetchError = error instanceof Error ? error : new Error(String(error));
    console.warn(`Archive fetch via ${target.via} failed: ${fetchError.message}`);
  }
}

if (!payload) {
  if (accountId && cfToken) {
    const existing = await readRecentSiteArchivePointer(siteId, {
      bucket,
      accountId,
      token: cfToken
    });
    if (existing) {
      console.warn(
        `Reusing recent platform archive from ${existing.archivedAt} (${existing.backupKey}) after live fetch failed.`
      );
      console.log(`Archived to r2://${bucket}/${existing.backupKey}`);
      console.log(`Latest pointer: r2://${bucket}/${existing.latestKey}`);
      console.log(`\n=== Archive complete (reused): ${siteId} ===`);
      process.exit(0);
    }
  }

  console.error(
    fetchError?.message ??
      'Archive fetch failed and no recent platform archive was available to reuse.'
  );
  process.exit(1);
}

const { backupKey, latestKey } = uploadSiteArchiveToR2(siteId, payload, {
  bucket,
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID
});

console.log(`Archived to r2://${bucket}/${backupKey}`);
console.log(`Latest pointer: r2://${bucket}/${latestKey}`);
console.log(`\n=== Archive complete: ${siteId} ===`);
